import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const chemin = process.argv.find(a => a.endsWith('.json'))

// Retire des écoles CRP les anciens élèves (matricule automatique MATxxx) qui ne figurent dans AUCUN fichier de
// scolarité fourni : les fichiers de la secrétaire font foi pour les effectifs et les montants perçus.
// Un élève est considéré comme présent dans le fichier s'il partage au moins 2 mots de son nom (ou la totalité
// de son nom) avec une ligne du fichier de la même école. Un élève ayant des reçus, notes, présences, bulletins
// ou vérifications n'est jamais supprimé (listé).

const normaliser = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean)
const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`

function meilleurRapprochement(mots, nomsFichier) {
  let meilleur = { score: 0, nom: '' }
  for (const f of nomsFichier) {
    const communs = mots.filter(m => f.mots.includes(m)).length
    const score = communs / Math.max(1, Math.min(mots.length, f.mots.length))
    if (communs >= Math.min(2, mots.length, f.mots.length) && score > meilleur.score) meilleur = { score, nom: f.nom }
  }
  return meilleur
}

async function main() {
  console.log(DRY_RUN ? '### SIMULATION — aucune modification ###' : '### SUPPRESSION RÉELLE ###')
  const fichiers = JSON.parse(fs.readFileSync(chemin, 'utf-8'))
  let supprimes = 0, retire = 0

  for (const { fichier, ecoleNom, feuilles } of fichiers) {
    const ecole = await prisma.ecole.findFirst({ where: { nomCourt: ecoleNom } })
    if (!ecole) continue
    const nomsFichier = feuilles.flatMap(f => f.eleves.map(e => ({ nom: e.nomComplet, mots: normaliser(e.nomComplet) })))

    const eleves = await prisma.eleve.findMany({
      where: { classe: { ecoleId: ecole.id } },
      include: { classe: true, inscriptionsFrais: true, _count: { select: { paiements: true, notes: true, presences: true, bulletins: true, verificationsPaiement: true, notesEvaluations: true, anomaliesDetectees: true } } }
    })
    console.log(`\n=== ${ecoleNom} (${fichier}) — ${eleves.length} élèves en base, ${nomsFichier.length} dans le fichier ===`)

    for (const e of eleves.filter(x => /^MAT\d+$/.test(x.matricule))) {
      const mots = normaliser(`${e.nom} ${e.prenom}`)
      const rapprochement = meilleurRapprochement(mots, nomsFichier)
      if (rapprochement.score > 0) continue // présent (sous une graphie proche) dans le fichier

      const paye = e.inscriptionsFrais.reduce((s, f) => s + f.montantPaye, 0)
      const liens = Object.values(e._count).some(n => n > 0)
      console.log(`  ${liens ? '⚠ CONSERVÉ (reçus/notes liés)' : '✗ retiré'} : ${e.matricule} ${e.nom} ${e.prenom} [${e.classe.nom}] — payé ${fcfa(paye)}, parent « ${e.nomParent} »`)
      if (liens) continue
      supprimes++
      retire += paye
      if (!DRY_RUN) await prisma.eleve.delete({ where: { id: e.id } })
    }
  }
  console.log(`\nÉlèves retirés : ${supprimes} | montants perçus retirés : ${fcfa(retire)}`)
}

main().catch(e => { console.error('ERREUR', e); process.exit(1) }).finally(() => prisma.$disconnect())
