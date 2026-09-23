import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { creerInscriptionsFraisPourEleve } from '../src/utils/inscriptionsFrais.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Corrige le découpage nom/prénom des élèves CBM déjà en base (l'import
// d'origine tronquait les noms composés à 2 mots) et ajoute les nouvelles
// admissions présentes dans le fichier le plus récent de la secrétaire.
//
// Stratégie de correspondance : ni le nom (qui change justement) ni le
// matricule (mélange de MAT0xx générés et de codes Mle d'origine repris
// tels quels pour d'anciennes corrections manuelles) ne peuvent servir de
// clé fiable, et l'ordre de création n'est pas non plus fiable (un élève
// ajouté manuellement plus tard peut se retrouver hors ordre par rapport
// au fichier). On associe donc chaque élève déjà en base à la ligne du
// fichier avec laquelle il partage au moins un mot du nom — uniquement
// quand cette correspondance est unique des deux côtés. Toute ambiguïté
// (aucune correspondance, ou plusieurs candidats) est signalée et laissée
// intacte plutôt que risquer de réattribuer le dossier financier d'un
// élève à un autre.

function motsDe(texte) {
  return new Set(String(texte).toUpperCase().split(/\s+/).filter(Boolean))
}

function ontUnMotCommun(a, b) {
  for (const mot of a) if (b.has(mot)) return true
  return false
}

function apparier(existants, fichier) {
  const motsExistants = existants.map(e => motsDe(`${e.nom} ${e.prenom}`))
  const motsFichier = fichier.map(f => motsDe(f.nomComplet))

  // Candidats de chaque côté
  const candidatsPourExistant = existants.map((_, i) =>
    fichier.map((_, j) => j).filter(j => ontUnMotCommun(motsExistants[i], motsFichier[j]))
  )

  const resultats = existants.map(() => ({ type: 'orphelin' }))
  const fichierCouvert = new Set()

  for (let i = 0; i < existants.length; i++) {
    const candidats = candidatsPourExistant[i]
    if (candidats.length === 0) {
      resultats[i] = { type: 'orphelin' }
      continue
    }
    if (candidats.length > 1) {
      resultats[i] = { type: 'ambigu', candidats }
      continue
    }
    const j = candidats[0]
    // Vérifie qu'aucun autre élève existant ne revendique la même ligne
    const autresCandidats = existants
      .map((_, k) => k)
      .filter(k => k !== i && candidatsPourExistant[k].includes(j))
    if (autresCandidats.length > 0) {
      resultats[i] = { type: 'conflit', j, autres: autresCandidats }
      continue
    }
    resultats[i] = { type: 'match', j }
    fichierCouvert.add(j)
  }

  return { resultats, fichierCouvert }
}

async function main() {
  const donnees = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cbm_eleves_extraits.json'), 'utf-8'))

  const ecole = await prisma.ecole.findFirst({ where: { nomCourt: 'CBM' } })
  if (!ecole) throw new Error('École CBM introuvable')

  const parClasse = new Map()
  donnees.forEach(e => {
    if (!parClasse.has(e.classe)) parClasse.set(e.classe, [])
    parClasse.get(e.classe).push(e)
  })

  const elevesExistantsGlobal = await prisma.eleve.findMany({ select: { matricule: true } })
  let prochainNumero = 1
  elevesExistantsGlobal.forEach(e => {
    const match = e.matricule.match(/^MAT(\d+)$/)
    if (match) prochainNumero = Math.max(prochainNumero, parseInt(match[1]) + 1)
  })

  let totalMisAJour = 0
  let totalCrees = 0
  let totalAmbigus = 0

  for (const [nomClasse, lignesFichier] of parClasse) {
    const classe = await prisma.classe.findFirst({ where: { ecoleId: ecole.id, nom: nomClasse } })
    if (!classe) {
      console.log(`⚠️  Classe "${nomClasse}" introuvable en base — ${lignesFichier.length} ligne(s) ignorée(s)`)
      continue
    }

    const elevesExistants = await prisma.eleve.findMany({
      where: { classeId: classe.id },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`\n=== ${nomClasse} (${elevesExistants.length} en base, ${lignesFichier.length} dans le fichier) ===`)

    const { resultats, fichierCouvert } = apparier(elevesExistants, lignesFichier)

    for (let i = 0; i < elevesExistants.length; i++) {
      const eleve = elevesExistants[i]
      const r = resultats[i]
      const nomCompletExistant = `${eleve.nom} ${eleve.prenom}`.trim()

      if (r.type === 'orphelin') {
        console.log(`  ⚠️  [${eleve.matricule}] "${nomCompletExistant}" — aucune ligne correspondante dans le fichier, laissé tel quel (à vérifier manuellement)`)
        totalAmbigus++
        continue
      }
      if (r.type === 'ambigu') {
        const options = r.candidats.map(j => `"${lignesFichier[j].nomComplet}"`).join(', ')
        console.log(`  ⚠️  [${eleve.matricule}] "${nomCompletExistant}" — plusieurs correspondances possibles (${options}), laissé tel quel (à vérifier manuellement)`)
        totalAmbigus++
        continue
      }
      if (r.type === 'conflit') {
        const autresMatricules = r.autres.map(k => elevesExistants[k].matricule).join(', ')
        console.log(`  ⚠️  [${eleve.matricule}] "${nomCompletExistant}" — même ligne fichier revendiquée par ${autresMatricules}, laissé tel quel (à vérifier manuellement)`)
        totalAmbigus++
        continue
      }

      const ligne = lignesFichier[r.j]
      const changements = []
      if (eleve.nom !== ligne.nom || eleve.prenom !== ligne.prenom) {
        changements.push(`nom/prénom: "${eleve.nom} ${eleve.prenom}" → "${ligne.nom} ${ligne.prenom}"`)
      }
      if (ligne.nomParent && eleve.nomParent !== ligne.nomParent) {
        changements.push(`parent: "${eleve.nomParent}" → "${ligne.nomParent}"`)
      }
      if (ligne.telephoneParent && eleve.telephoneParent !== ligne.telephoneParent) {
        changements.push(`téléphone: "${eleve.telephoneParent}" → "${ligne.telephoneParent}"`)
      }

      if (changements.length === 0) continue

      console.log(`  [${eleve.matricule}] ${changements.join(' | ')}`)
      totalMisAJour++

      if (!DRY_RUN) {
        await prisma.eleve.update({
          where: { id: eleve.id },
          data: {
            nom: ligne.nom,
            prenom: ligne.prenom,
            ...(ligne.nomParent && { nomParent: ligne.nomParent }),
            ...(ligne.telephoneParent && { telephoneParent: ligne.telephoneParent })
          }
        })
      }
    }

    for (let j = 0; j < lignesFichier.length; j++) {
      if (fichierCouvert.has(j)) continue
      const ligne = lignesFichier[j]
      const matricule = `MAT${String(prochainNumero).padStart(3, '0')}`
      prochainNumero++

      console.log(`  + NOUVEAU [${matricule}] ${ligne.nom} ${ligne.prenom} (parent: ${ligne.nomParent || '?'}, tel: ${ligne.telephoneParent || '?'})`)
      totalCrees++

      if (!DRY_RUN) {
        const eleve = await prisma.eleve.create({
          data: {
            matricule,
            nom: ligne.nom,
            prenom: ligne.prenom,
            classeId: classe.id,
            nomParent: ligne.nomParent || 'Non renseigné',
            telephoneParent: ligne.telephoneParent || 'Non renseigné'
          }
        })
        await creerInscriptionsFraisPourEleve(prisma, eleve.id, ecole.id, classe.niveau, 0)
      }
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total : ${totalMisAJour} mis à jour, ${totalCrees} créés, ${totalAmbigus} ambigu(s) laissé(s) tel quel`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
