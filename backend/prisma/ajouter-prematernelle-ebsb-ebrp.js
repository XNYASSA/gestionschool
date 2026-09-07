import { PrismaClient } from '@prisma/client'
import { synchroniserInscriptionsFrais } from '../src/utils/inscriptionsFrais.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Pré-Maternelle confirmée comme 3 classes distinctes (et non un seul niveau),
// une seule classe par niveau (pas de A/B), comme pour le reste de l'école.
// Tarif "Pré-Maternelle (<3 ans)" du document initial (Analyse_Frais_Scolaires
// 2026/2027), jusqu'ici non appliqué faute de savoir combien de classes il
// couvrait — les 3 niveaux partagent le même barème.
const NIVEAUX_PREMATERNELLE = ['Prématernelle', 'Prématernelle Première Année', 'Prématernelle Deuxième Année']

const BAREMES = {
  EBSB: { montantInscription: 25000, tranches: [30000, 25000] }, // total 80 000 F
  EBRP: { montantInscription: 25000, tranches: [35000, 30000, 15000] } // total 105 000 F
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Ajout de la Pré-Maternelle EBSB/EBRP\n')

  for (const [nomCourt, bareme] of Object.entries(BAREMES)) {
    const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
    if (!ecole) { console.log(`⚠️  École "${nomCourt}" introuvable.`); continue }

    for (const niveau of NIVEAUX_PREMATERNELLE) {
      const existante = await prisma.classe.findFirst({ where: { ecoleId: ecole.id, nom: niveau } })
      if (existante) {
        console.log(`${nomCourt} — classe "${niveau}" existe déjà, ignorée.`)
      } else {
        console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — création de la classe "${niveau}"`)
        if (!DRY_RUN) await prisma.classe.create({ data: { nom: niveau, niveau, ecoleId: ecole.id } })
      }
    }

    let config = await prisma.configurationFrais.findFirst({ where: { ecoleId: ecole.id, libelle: 'Pré-Maternelle' } })
    if (!config) {
      console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — création du barème "Pré-Maternelle" (inscription ${bareme.montantInscription} F, tranches ${bareme.tranches.join('/')} F)`)
      if (!DRY_RUN) {
        config = await prisma.configurationFrais.create({
          data: {
            ecoleId: ecole.id,
            libelle: 'Pré-Maternelle',
            montantInscription: bareme.montantInscription,
            tranches: { create: bareme.tranches.map((montant, i) => ({ numero: i + 1, montant })) }
          }
        })
      }
    } else {
      console.log(`${nomCourt} — barème "Pré-Maternelle" existe déjà, ignoré.`)
    }

    for (const niveau of NIVEAUX_PREMATERNELLE) {
      const lien = await prisma.configurationFraisNiveau.findUnique({ where: { ecoleId_niveau: { ecoleId: ecole.id, niveau } } })
      if (!lien) {
        console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — rattachement du niveau "${niveau}" au barème "Pré-Maternelle"`)
        if (!DRY_RUN && config) await prisma.configurationFraisNiveau.create({ data: { configurationFraisId: config.id, ecoleId: ecole.id, niveau } })
      } else {
        console.log(`${nomCourt} — niveau "${niveau}" déjà rattaché à un barème, ignoré.`)
      }
    }
  }

  if (!DRY_RUN) {
    console.log('\n✍️  Synchronisation des élèves déjà inscrits (s\'il y en a)...')
    for (const nomCourt of Object.keys(BAREMES)) {
      const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
      const config = await prisma.configurationFrais.findFirst({ where: { ecoleId: ecole.id, libelle: 'Pré-Maternelle' }, include: { tranches: true } })
      if (!config) continue
      await synchroniserInscriptionsFrais(prisma, config.id, 'inscription', "Frais d'inscription", config.montantInscription)
      for (const t of config.tranches) {
        await synchroniserInscriptionsFrais(prisma, config.id, `tranche${t.numero}`, `Tranche ${t.numero}`, t.montant)
      }
    }
  }

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
