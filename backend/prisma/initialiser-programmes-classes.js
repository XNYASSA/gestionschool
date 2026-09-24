import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// 1. Remet à 0 le coefficient de toutes les matières : le coefficient devient
//    propre à chaque classe (table ClasseMatiere) et sera saisi par le Principal.
// 2. Reprend dans le programme de chaque classe les matières déjà affectées à
//    un enseignant (EnseignantClasseMatiere), avec un coefficient à 0, pour que
//    les affectations existantes restent cohérentes avec le nouveau programme.
async function main() {
  const nbMatieresNonNulles = await prisma.matiere.count({ where: { coefficient: { not: 0 } } })
  const nbMatieres = await prisma.matiere.count()
  console.log(`Matières : ${nbMatieres} au total, ${nbMatieresNonNulles} avec un coefficient différent de 0 → remise à 0`)

  const ecms = await prisma.enseignantClasseMatiere.findMany({ select: { classeId: true, matiereId: true } })
  const paires = new Map(ecms.map(e => [`${e.classeId}|${e.matiereId}`, e]))
  const dejaPresentes = await prisma.classeMatiere.findMany({ select: { classeId: true, matiereId: true } })
  dejaPresentes.forEach(p => paires.delete(`${p.classeId}|${p.matiereId}`))
  console.log(`Affectations existantes reprises dans les programmes : ${paires.size} (déjà présentes : ${dejaPresentes.length})`)

  if (DRY_RUN) {
    console.log('[DRY RUN] Aucune modification effectuée.')
    return
  }

  await prisma.matiere.updateMany({ data: { coefficient: 0 } })
  for (const { classeId, matiereId } of paires.values()) {
    await prisma.classeMatiere.create({ data: { classeId, matiereId, coefficient: 0 } })
  }
  console.log('Terminé.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
