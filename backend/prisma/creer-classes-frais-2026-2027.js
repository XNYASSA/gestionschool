import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Nouvelles classes nécessaires pour appliquer les vrais barèmes 2026/2027,
// d'après le document détaillé (frais-scolarité.pdf). Une seule classe par
// niveau (pas de section A/B), comme confirmé par le client. Chaque entrée
// est soit une chaîne (nom === niveau), soit [nom, niveau] quand ils diffèrent.
// Pré-Maternelle / Pre-Nursery volontairement exclues : le client confirmera
// la vraie appellation plus tard.
const NOUVELLES_CLASSES = {
  CRP_FRANCOPHONE: [
    '6ème', '5ème', '4ème', '3ème',
    '2nde', '1ère Littéraire', 'Tle Littéraire', '1ère Scientifique', 'Tle Scientifique'
  ],
  CRP_ANGLOPHONE: [
    'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5',
    'Lower Sixth Science', 'Upper Sixth Arts', 'Upper Sixth Science'
  ],
  CRP_TECHNIQUE: [
    'Industriel 1ère Année', 'Industriel 2è-4è Année',
    'Commercial Francophone 1ère Année', 'Commercial Francophone 2è-4è Année',
    'Commercial Anglophone 1ère Année', 'Commercial Anglophone 2è-4è Année'
  ],
  EBSB: [
    ['Petite Section', 'PS'], ['Moyenne Section', 'MS'], ['Grande Section', 'GS'], ['SIL', 'SIL'],
    ['CP', 'CP'], ['CE1', 'CE1'], ['CE2', 'CE2'], ['CM1', 'CM1'], ['CM2', 'CM2'],
    'Nursery', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6'
  ],
  EBRP: [
    ['Petite Section', 'PS'], ['Moyenne Section', 'MS'], ['Grande Section', 'GS'], ['SIL', 'SIL'],
    ['CP', 'CP'], ['CE1', 'CE1'], ['CE2', 'CE2'], ['CM1', 'CM1'], ['CM2', 'CM2'],
    'Nursery', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6'
  ]
}

// EBSB/EBRP : la section Anglophone (Nursery à Class 6) a les mêmes montants
// que la section Francophone (Maternelle à CM2) — un seul barème couvre les
// deux, il faut juste y rattacher les nouveaux niveaux anglophones.
const NIVEAUX_ANGLOPHONES_A_RATTACHER = {
  EBSB: { libelleConfig: 'Maternelle à CM2', niveaux: ['Nursery', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6'] },
  EBRP: { libelleConfig: 'Maternelle à CM2', niveaux: ['Nursery', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6'] }
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Création des classes 2026/2027\n')

  for (const [nomCourt, entrees] of Object.entries(NOUVELLES_CLASSES)) {
    const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
    if (!ecole) {
      console.log(`⚠️  École "${nomCourt}" introuvable, ignorée.`)
      continue
    }

    for (const entree of entrees) {
      const [nom, niveau] = Array.isArray(entree) ? entree : [entree, entree]
      const existante = await prisma.classe.findFirst({ where: { ecoleId: ecole.id, nom } })
      if (existante) {
        console.log(`${nomCourt} — classe "${nom}" existe déjà, ignorée.`)
        continue
      }
      console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — création de la classe "${nom}" (niveau: ${niveau})`)
      if (!DRY_RUN) {
        await prisma.classe.create({ data: { nom, niveau, ecoleId: ecole.id } })
      }
    }
  }

  console.log(DRY_RUN ? '\n🔍 Rattachement des niveaux anglophones (dry-run) :\n' : '\n✍️  Rattachement des niveaux anglophones au barème existant :\n')

  for (const [nomCourt, { libelleConfig, niveaux }] of Object.entries(NIVEAUX_ANGLOPHONES_A_RATTACHER)) {
    const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
    if (!ecole) continue

    const config = await prisma.configurationFrais.findFirst({ where: { ecoleId: ecole.id, libelle: libelleConfig } })
    if (!config) {
      console.log(`⚠️  ${nomCourt} — barème "${libelleConfig}" introuvable, rattachement ignoré.`)
      continue
    }

    for (const niveau of niveaux) {
      const existant = await prisma.configurationFraisNiveau.findUnique({ where: { ecoleId_niveau: { ecoleId: ecole.id, niveau } } })
      if (existant) {
        console.log(`${nomCourt} — niveau "${niveau}" déjà rattaché à un barème, ignoré.`)
        continue
      }
      console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — rattachement du niveau "${niveau}" au barème "${libelleConfig}"`)
      if (!DRY_RUN) {
        await prisma.configurationFraisNiveau.create({ data: { configurationFraisId: config.id, ecoleId: ecole.id, niveau } })
      }
    }
  }

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
