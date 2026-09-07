import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Nouvelles classes nécessaires pour appliquer les vrais barèmes 2026/2027 :
// niveaux de lycée (CRP Francophone/Anglophone) et filières du CRP Technique
// qui n'existaient pas encore. Une seule classe par niveau (pas de section A/B),
// comme confirmé par le client.
const NOUVELLES_CLASSES = {
  CRP_FRANCOPHONE: ['2nde', '1ère Littéraire', 'Tle Littéraire', '1ère Scientifique', 'Tle Scientifique'],
  CRP_ANGLOPHONE: ['Lower Sixth Science', 'Upper Sixth Arts', 'Upper Sixth Science'],
  CRP_TECHNIQUE: [
    'Industriel 1ère Année', 'Industriel 2è-4è Année',
    'Commercial Francophone 1ère Année', 'Commercial Francophone 2è-4è Année',
    'Commercial Anglophone 1ère Année', 'Commercial Anglophone 2è-4è Année'
  ]
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Création des classes 2026/2027\n')

  for (const [nomCourt, niveaux] of Object.entries(NOUVELLES_CLASSES)) {
    const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
    if (!ecole) {
      console.log(`⚠️  École "${nomCourt}" introuvable, ignorée.`)
      continue
    }

    for (const niveau of niveaux) {
      const existante = await prisma.classe.findFirst({ where: { ecoleId: ecole.id, nom: niveau } })
      if (existante) {
        console.log(`${nomCourt} — classe "${niveau}" existe déjà, ignorée.`)
        continue
      }
      console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — création de la classe "${niveau}"`)
      if (!DRY_RUN) {
        await prisma.classe.create({ data: { nom: niveau, niveau, ecoleId: ecole.id } })
      }
    }
  }

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
