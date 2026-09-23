import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { calculerStatut } from '../src/utils/inscriptionsFrais.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Corrige les montants payés des élèves CBM d'après le fichier réel de la
// secrétaire (colonnes Inscription/Tranche 1/2/3), après avoir découvert que
// les 82 élèves ajoutés par corriger-noms-cbm-2026-2027.js l'ont été avec
// "0 payé" par défaut alors qu'ils ont réellement déjà versé de l'argent —
// l'application affichait donc "non payé" pour des élèves ayant payé,
// un risque sérieux pour la sincérité des comptes.
//
// Correspondance : même appariement par mots communs du nom que le script
// de correction des noms (fiable désormais que les noms sont corrigés).
//
// Sécurité : ne redistribue le total payé sur les postes (inscription puis
// tranches, dans l'ordre) QUE si aucun poste ne verrait son montant déjà
// enregistré diminuer. Si un paiement a été saisi en direct dans l'app
// depuis (poste non nul et incompatible avec la redistribution simple),
// la ligne est laissée intacte et signalée pour vérification manuelle
// plutôt que d'effacer un paiement réel.

function motsDe(texte) {
  return new Set(String(texte).toUpperCase().split(/\s+/).filter(Boolean))
}

function nombreMotsCommuns(a, b) {
  let n = 0
  for (const mot of a) if (b.has(mot)) n++
  return n
}

function meilleursCandidats(mots, motsFichier) {
  let meilleurScore = 0
  let meilleurs = []
  for (let j = 0; j < motsFichier.length; j++) {
    const score = nombreMotsCommuns(mots, motsFichier[j])
    if (score === 0) continue
    if (score > meilleurScore) {
      meilleurScore = score
      meilleurs = [j]
    } else if (score === meilleurScore) {
      meilleurs.push(j)
    }
  }
  return meilleurs
}

function apparier(existants, fichier) {
  const motsExistants = existants.map(e => motsDe(`${e.nom} ${e.prenom}`))
  const motsFichier = fichier.map(f => motsDe(f.nomComplet))
  const candidatsPourExistant = existants.map((_, i) => meilleursCandidats(motsExistants[i], motsFichier))

  const resultats = existants.map(() => ({ type: 'orphelin' }))

  for (let i = 0; i < existants.length; i++) {
    const candidats = candidatsPourExistant[i]
    if (candidats.length === 0) { resultats[i] = { type: 'orphelin' }; continue }
    if (candidats.length > 1) { resultats[i] = { type: 'ambigu', candidats }; continue }
    const j = candidats[0]
    const autresCandidats = existants.map((_, k) => k).filter(k => k !== i && candidatsPourExistant[k].includes(j))
    if (autresCandidats.length > 0) { resultats[i] = { type: 'conflit', j, autres: autresCandidats }; continue }
    resultats[i] = { type: 'match', j }
  }

  return resultats
}

// Ordre des postes : inscription, puis tranche1, tranche2, ... par numéro croissant
function ordonnerPostes(postes) {
  return [...postes].sort((a, b) => {
    if (a.tranche === 'inscription') return -1
    if (b.tranche === 'inscription') return 1
    const na = parseInt((a.tranche.match(/\d+/) || [0])[0])
    const nb = parseInt((b.tranche.match(/\d+/) || [0])[0])
    return na - nb
  })
}

async function main() {
  const donnees = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cbm_paiements_extraits.json'), 'utf-8'))

  const ecole = await prisma.ecole.findFirst({ where: { nomCourt: 'CBM' } })
  if (!ecole) throw new Error('École CBM introuvable')

  const parClasse = new Map()
  donnees.forEach(e => {
    if (!parClasse.has(e.classe)) parClasse.set(e.classe, [])
    parClasse.get(e.classe).push(e)
  })

  let totalCorriges = 0
  let totalDejaCorrects = 0
  let totalIgnores = 0

  for (const [nomClasse, lignesFichier] of parClasse) {
    const classe = await prisma.classe.findFirst({ where: { ecoleId: ecole.id, nom: nomClasse } })
    if (!classe) {
      console.log(`⚠️  Classe "${nomClasse}" introuvable en base — ${lignesFichier.length} ligne(s) ignorée(s)`)
      continue
    }

    const elevesExistants = await prisma.eleve.findMany({
      where: { classeId: classe.id },
      include: { inscriptionsFrais: true }
    })

    const resultats = apparier(elevesExistants, lignesFichier)

    for (let i = 0; i < elevesExistants.length; i++) {
      const eleve = elevesExistants[i]
      const r = resultats[i]
      const nomCompletExistant = `${eleve.nom} ${eleve.prenom}`.trim()

      if (r.type !== 'match') {
        continue // déjà signalé par le script de correction des noms
      }

      const ligne = lignesFichier[r.j]
      const cible = ligne.totalPaye

      const postes = ordonnerPostes(eleve.inscriptionsFrais)
      if (postes.length === 0) continue // pas encore de barème lié, rien à corriger ici

      const actuel = postes.reduce((s, p) => s + p.montantPaye, 0)
      if (actuel === cible) { totalDejaCorrects++; continue }

      // Calcule la répartition proposée (cible réparti dans l'ordre des postes)
      let restant = cible
      const propositions = postes.map(p => {
        const montant = Math.max(0, Math.min(restant, p.montantDu))
        restant -= montant
        return { poste: p, nouveauMontantPaye: montant }
      })

      // Sécurité : n'applique que si aucun poste ne diminue par rapport à l'existant
      const uneRegression = propositions.some(p => p.nouveauMontantPaye < p.poste.montantPaye)
      if (uneRegression) {
        console.log(`  ⚠️  [${eleve.matricule}] "${nomCompletExistant}" (${nomClasse}) — fichier=${cible} FCFA, app=${actuel} FCFA, la répartition ferait baisser un poste déjà payé : laissé tel quel, à vérifier manuellement`)
        totalIgnores++
        continue
      }

      console.log(`  [${eleve.matricule}] "${nomCompletExistant}" (${nomClasse}) : ${actuel} → ${cible} FCFA`)
      totalCorriges++

      if (!DRY_RUN) {
        for (const { poste, nouveauMontantPaye } of propositions) {
          if (nouveauMontantPaye === poste.montantPaye) continue
          await prisma.inscriptionFrais.update({
            where: { id: poste.id },
            data: { montantPaye: nouveauMontantPaye, statut: calculerStatut(poste.montantDu, nouveauMontantPaye) }
          })
        }
      }
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total : ${totalCorriges} corrigés, ${totalDejaCorrects} déjà corrects, ${totalIgnores} ignorés (à vérifier manuellement)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
