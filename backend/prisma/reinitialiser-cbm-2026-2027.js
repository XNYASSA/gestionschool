import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { creerInscriptionsFraisPourEleve, calculerStatut } from '../src/utils/inscriptionsFrais.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Remise à zéro complète des élèves CBM, à la demande explicite de la
// secrétaire après plusieurs erreurs de classement et de paiement révélées
// par les corrections incrémentales précédentes (deux élèves mal classés
// depuis le tout premier import, montants de paiement encore faux malgré
// deux passes de correction). Plutôt que de continuer à rapiécer des
// données dont l'historique est devenu peu fiable, ce script supprime tous
// les élèves CBM (cascade : leurs frais/paiements/notes/présences aussi)
// et les recrée intégralement depuis cbm_complet.json — une extraction
// corrigée qui scanne chaque feuille jusqu'à sa dernière ligne réelle
// (l'extraction précédente s'arrêtait après 5 lignes vides consécutives,
// ratant des élèves dans des feuilles ayant de plus grands trous, comme
// "2nd C" qui saute de la ligne 9 à la ligne 20 — c'est ce qui avait classé
// à tort "OLEME METOMO PRINCESSE" comme orpheline).
//
// La classe de chaque élève vient directement de la feuille Excel où il se
// trouve (pas d'appariement par nom) : c'est la source la plus fiable, et
// ça corrige de facto tout élève placé dans la mauvaise classe à l'origine.

async function main() {
  const donnees = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cbm_complet.json'), 'utf-8'))

  const ecole = await prisma.ecole.findFirst({ where: { nomCourt: 'CBM' } })
  if (!ecole) throw new Error('École CBM introuvable')

  const classesEcole = await prisma.classe.findMany({ where: { ecoleId: ecole.id } })
  const classeParNom = new Map(classesEcole.map(c => [c.nom, c]))

  // Vérifie que toutes les classes du fichier existent avant de rien supprimer
  const classesManquantes = [...new Set(donnees.map(e => e.classe))].filter(c => !classeParNom.has(c))
  if (classesManquantes.length > 0) {
    throw new Error(`Classes introuvables en base, arrêt sans rien supprimer : ${classesManquantes.join(', ')}`)
  }

  const nbAvant = await prisma.eleve.count({ where: { classe: { ecoleId: ecole.id } } })
  console.log(`Élèves CBM actuellement en base : ${nbAvant}`)
  console.log(`Élèves à recréer depuis le fichier : ${donnees.length}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Aucune suppression ni création effectuée. Aperçu des 5 premières lignes :')
    donnees.slice(0, 5).forEach(e => console.log(`  ${e.nom} ${e.prenom} | ${e.classe} | payé=${e.totalPaye} FCFA`))
    return
  }

  await prisma.eleve.deleteMany({ where: { classe: { ecoleId: ecole.id } } })
  console.log(`${nbAvant} élève(s) CBM supprimé(s) (cascade : frais, paiements, notes, présences).`)

  const elevesAutresEcoles = await prisma.eleve.findMany({ select: { matricule: true } })
  let prochainNumero = 1
  elevesAutresEcoles.forEach(e => {
    const match = e.matricule.match(/^MAT(\d+)$/)
    if (match) prochainNumero = Math.max(prochainNumero, parseInt(match[1]) + 1)
  })

  let crees = 0
  for (const ligne of donnees) {
    const classe = classeParNom.get(ligne.classe)
    const matricule = `MAT${String(prochainNumero).padStart(3, '0')}`
    prochainNumero++

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

    const postes = await creerInscriptionsFraisPourEleve(prisma, eleve.id, ecole.id, classe.niveau)
    const posteParTranche = Object.fromEntries(postes.map(p => [p.tranche, p]))
    const montants = { inscription: ligne.inscription, tranche1: ligne.tranche1, tranche2: ligne.tranche2, tranche3: ligne.tranche3 }

    for (const [tranche, montantBrut] of Object.entries(montants)) {
      const poste = posteParTranche[tranche]
      if (!poste || !montantBrut) continue
      const nouveauMontantPaye = Math.min(montantBrut, poste.montantDu)
      if (nouveauMontantPaye === 0) continue
      await prisma.inscriptionFrais.update({
        where: { id: poste.id },
        data: { montantPaye: nouveauMontantPaye, statut: calculerStatut(poste.montantDu, nouveauMontantPaye) }
      })
    }

    crees++
  }

  console.log(`\n${crees} élève(s) CBM recréé(s) avec leurs paiements réels.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
