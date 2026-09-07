import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Classes créées par le seed de démonstration initial (sections A/B par niveau),
// remplacées par les vraies classes 2026/2027 (voir creer-classes-frais-2026-2027.js).
// 6ème A et 5ème A du CBM sont volontairement absentes : elles portent les vrais
// élèves importés depuis le fichier de la secrétaire.
const CLASSES_DEMO_A_SUPPRIMER = {
  CBM: ['6ème B', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'],
  CRP_ANGLOPHONE: ['Form 1 A', 'Form 1 B', 'Form 2 A', 'Form 2 B', 'Form 3 A', 'Form 3 B', 'Form 4 A', 'Form 4 B', 'Form 5 A', 'Form 5 B'],
  CRP_FRANCOPHONE: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'],
  CRP_TECHNIQUE: ['1ère année A', '1ère année B', '2ème année A', '2ème année B'],
  EBRP: ['Petite Section A', 'Petite Section B', 'Moyenne Section A', 'Moyenne Section B', 'Grande Section A', 'Grande Section B', 'SIL A', 'SIL B', 'CP A', 'CP B', 'CE1 A', 'CE1 B', 'CE2 A', 'CE2 B', 'CM1 A', 'CM1 B', 'CM2 A', 'CM2 B'],
  EBSB: ['Petite Section A', 'Petite Section B', 'Moyenne Section A', 'Moyenne Section B', 'Grande Section A', 'Grande Section B', 'SIL A', 'SIL B', 'CP A', 'CP B', 'CE1 A', 'CE1 B', 'CE2 A', 'CE2 B', 'CM1 A', 'CM1 B', 'CM2 A', 'CM2 B']
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Suppression des classes de démonstration\n')

  for (const [nomCourt, noms] of Object.entries(CLASSES_DEMO_A_SUPPRIMER)) {
    const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
    if (!ecole) {
      console.log(`⚠️  École "${nomCourt}" introuvable, ignorée.`)
      continue
    }

    for (const nom of noms) {
      const classe = await prisma.classe.findFirst({ where: { ecoleId: ecole.id, nom }, include: { _count: { select: { eleves: true } } } })
      if (!classe) {
        console.log(`${nomCourt} — classe "${nom}" déjà absente, ignorée.`)
        continue
      }
      if (classe._count.eleves > 0) {
        console.log(`⚠️  ${nomCourt} — classe "${nom}" contient ${classe._count.eleves} élève(s), SUPPRESSION REFUSÉE.`)
        continue
      }
      console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — suppression de la classe "${nom}"`)
      if (!DRY_RUN) {
        await prisma.classe.delete({ where: { id: classe.id } })
      }
    }
  }

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
