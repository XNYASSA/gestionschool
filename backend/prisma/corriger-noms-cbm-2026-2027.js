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
// matricule système MAT0xx (jamais aligné sur les codes "Mle" du fichier)
// ne peuvent servir de clé directe. On s'appuie sur l'ordre : au sein d'une
// même classe, les N premières lignes du fichier correspondent aux N élèves
// déjà en base dans leur ordre de création (matricule croissant).
//
// Garde-fou : avant toute mise à jour, on vérifie qu'au moins un mot est
// commun entre l'ancien nom+prénom en base et le nouveau nom complet du
// fichier à la position correspondante. Si aucun décalage ne donne une
// concordance parfaite et qu'un mot commun manque, la ligne est laissée
// intacte et signalée — jamais écrasée à l'aveugle (un décalage d'une
// ligne parasite dans le fichier source a été détecté sur 2 classes lors
// de la vérification manuelle : mieux vaut rater une mise à jour que
// réattribuer le dossier financier d'un élève à un autre par erreur).

function motsCommuns(a, b) {
  const wa = new Set(a.toUpperCase().split(/\s+/).filter(Boolean))
  const wb = new Set(String(b).toUpperCase().split(/\s+/).filter(Boolean))
  for (const w of wa) if (wb.has(w)) return true
  return false
}

// Cherche un décalage constant (-3 à +3) entre l'ordre des élèves déjà en
// base et l'ordre des lignes du fichier, uniquement si ce décalage donne
// une concordance parfaite (chaque nom en base partage au moins un mot
// avec la ligne du fichier à cette position) — sinon, aucun décalage n'est
// appliqué et chaque ligne est vérifiée individuellement.
function trouverDecalage(existants, fichier) {
  const score = (decalage) => {
    let concordent = 0, total = 0
    for (let i = 0; i < existants.length; i++) {
      const j = i + decalage
      if (j < 0 || j >= fichier.length) continue
      const nomComplet = `${existants[i].nom} ${existants[i].prenom}`.trim()
      if (!nomComplet) continue
      total++
      if (motsCommuns(nomComplet, fichier[j].nomComplet)) concordent++
    }
    return { concordent, total }
  }

  const base = score(0)
  if (base.total > 0 && base.concordent === base.total) return 0

  for (let decalage = -3; decalage <= 3; decalage++) {
    if (decalage === 0) continue
    const { concordent, total } = score(decalage)
    if (total > 0 && concordent === total) return decalage
  }
  return 0
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
    const match = e.matricule.match(/\d+/)
    if (match) prochainNumero = Math.max(prochainNumero, parseInt(match[0]) + 1)
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

    const decalage = trouverDecalage(elevesExistants, lignesFichier)
    if (decalage !== 0) {
      console.log(`  ↳ décalage de ${decalage} détecté et corrigé automatiquement (concordance parfaite des noms à ce décalage)`)
    }

    const indicesFichierCouverts = new Set()

    for (let i = 0; i < elevesExistants.length; i++) {
      const eleve = elevesExistants[i]
      const j = i + decalage

      if (j < 0 || j >= lignesFichier.length) {
        console.log(`  ⚠️  [${eleve.matricule}] "${eleve.nom} ${eleve.prenom}" — aucune ligne correspondante dans le fichier, laissé tel quel (à vérifier manuellement)`)
        totalAmbigus++
        continue
      }

      const ligne = lignesFichier[j]
      const nomCompletExistant = `${eleve.nom} ${eleve.prenom}`.trim()
      if (nomCompletExistant && !motsCommuns(nomCompletExistant, ligne.nomComplet)) {
        console.log(`  ⚠️  [${eleve.matricule}] "${nomCompletExistant}" vs fichier "${ligne.nomComplet}" — aucun mot commun, laissé tel quel (à vérifier manuellement)`)
        totalAmbigus++
        continue
      }

      indicesFichierCouverts.add(j)

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
      if (indicesFichierCouverts.has(j)) continue
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
