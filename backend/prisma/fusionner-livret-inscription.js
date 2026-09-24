import { PrismaClient } from '@prisma/client'
import { slugifier, calculerStatut } from '../src/utils/inscriptionsFrais.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Fusionne le frais annexe "Livret Médical" (1000 FCFA) dans l'inscription,
// pour tous les barèmes de toutes les écoles où il existe — à la demande du
// commanditaire, pour n'avoir qu'un seul montant d'inscription. S'applique
// au barème (montantInscription augmenté, le frais annexe retiré) et à
// chaque élève déjà inscrit sous ce barème (son poste "inscription" absorbe
// le montant dû et déjà payé de son poste "livret", qui est ensuite retiré).

async function main() {
  const annexesLivret = await prisma.fraisAnnexe.findMany({
    where: { nom: { contains: 'ivret' } },
    include: { configurationFrais: { include: { ecole: true, niveaux: true } } }
  })

  if (annexesLivret.length === 0) {
    console.log('Aucun frais annexe "Livret" trouvé.')
    return
  }

  let totalElevesFusionnes = 0

  for (const annexe of annexesLivret) {
    const config = annexe.configurationFrais
    const trancheAnnexe = `annexe_${slugifier(annexe.nom)}`
    console.log(`\n=== ${config.ecole.nomCourt} — ${config.libelle} (niveaux: ${config.niveaux.map(n => n.niveau).join(', ')}) ===`)
    console.log(`  Frais annexe "${annexe.nom}" (${annexe.montant} FCFA) → fusionné dans l'inscription`)

    const niveaux = config.niveaux.map(n => n.niveau)
    const eleves = await prisma.eleve.findMany({
      where: { classe: { ecoleId: config.ecoleId, niveau: { in: niveaux } } },
      include: { inscriptionsFrais: true }
    })

    for (const eleve of eleves) {
      const posteInscription = eleve.inscriptionsFrais.find(p => p.tranche === 'inscription')
      const posteLivret = eleve.inscriptionsFrais.find(p => p.tranche === trancheAnnexe)
      if (!posteInscription || !posteLivret) continue

      const nouveauMontantDu = posteInscription.montantDu + posteLivret.montantDu
      const nouveauMontantPaye = posteInscription.montantPaye + posteLivret.montantPaye

      console.log(`  [${eleve.matricule}] ${eleve.nom} ${eleve.prenom} : inscription ${posteInscription.montantDu}+${posteLivret.montantDu}=${nouveauMontantDu} FCFA, payé ${posteInscription.montantPaye}+${posteLivret.montantPaye}=${nouveauMontantPaye} FCFA`)

      if (!DRY_RUN) {
        await prisma.inscriptionFrais.update({
          where: { id: posteInscription.id },
          data: {
            montantDu: nouveauMontantDu,
            montantPaye: nouveauMontantPaye,
            statut: calculerStatut(nouveauMontantDu, nouveauMontantPaye)
          }
        })
        await prisma.inscriptionFrais.delete({ where: { id: posteLivret.id } })
      }
      totalElevesFusionnes++
    }

    if (!DRY_RUN) {
      await prisma.configurationFrais.update({
        where: { id: config.id },
        data: { montantInscription: config.montantInscription + annexe.montant }
      })
      await prisma.fraisAnnexe.delete({ where: { id: annexe.id } })
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total : ${annexesLivret.length} barème(s) mis à jour, ${totalElevesFusionnes} élève(s) fusionné(s)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
