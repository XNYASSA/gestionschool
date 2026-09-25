import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Classes de l'enseignement technique : une classe par discipline (industriel / commercial) et par
// année. Les filières (mécanique auto, comptabilité...) sont portées par chaque élève, pas par la classe.
// Le niveau de chaque classe est celui auquel le barème de frais est rattaché
// (voir appliquer-modalites-frais-2026-2027.js).
const ORDINAUX = ['1ère', '2ème', '3ème', '4ème']

const ECOLES = [
  {
    // Form 4 sans distinction Art / Science (élèves de la feuille « FORM4 » du fichier de scolarité)
    nomCourt: 'CRP_ANGLOPHONE GENERAL',
    classes: [{ nom: 'F4', niveau: 'FORM FOUR' }]
  },
  {
    nomCourt: 'CRP_TECHNIQUE FRANCOPHONE',
    classes: ['Industriel', 'Commercial'].flatMap(disc => ORDINAUX.map(o => ({ nom: `${disc} - ${o} année`, niveau: `${disc} ${o} Année` })))
  },
  {
    nomCourt: 'CRP_ANGLOPHONE TECHNICAL',
    classes: ['Industrial', 'Commercial'].flatMap(disc => [1, 2, 3, 4].map(n => ({ nom: `${disc} - Year ${n}`, niveau: `${disc} Year ${n}` })))
  }
]

async function main() {
  console.log(DRY_RUN ? '### SIMULATION ###' : '### CRÉATION ###')
  for (const { nomCourt, classes } of ECOLES) {
    const ecole = await prisma.ecole.findFirst({ where: { nomCourt } })
    if (!ecole) { console.log(`École "${nomCourt}" absente, ignorée`); continue }
    const existantes = await prisma.classe.findMany({ where: { ecoleId: ecole.id } })
    const noms = new Set(existantes.map(c => c.nom.toLowerCase()))
    let crees = 0
    for (const c of classes) {
      if (noms.has(c.nom.toLowerCase())) continue
      crees++
      console.log(`  + ${nomCourt} : ${c.nom} [${c.niveau}]`)
      if (!DRY_RUN) await prisma.classe.create({ data: { ...c, ecoleId: ecole.id } })
    }
    console.log(`${nomCourt} : ${crees} classe(s) créée(s), ${existantes.length} déjà présente(s)`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
