import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { synchroniserPaiementsCibles } from '../src/utils/inscriptionsFrais.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Reprend les montants payés de "SCOLARITE 2026-20267 CBM .xlsx" (cbm_complet.json) et les
// réimpute sur les barèmes actuels. La colonne Inscription du fichier couvre l'inscription et
// les frais hors tranches (TD) : elle est imputée sur l'inscription puis sur le TD. Corrige les
// montants écrêtés lors de la réinitialisation (calculée avec un ancien barème).
// Ne diminue jamais un montant déjà enregistré ; ce qui dépasse le dû est signalé, pas perdu.

const ARRET_SIMULATION = new Error('simulation')
const fcfa = (n) => `${n.toLocaleString('fr-FR')} FCFA`
const cle = (nom, prenom, classe) => [nom, prenom, classe].map(s => String(s).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')).join('|')

async function traiter(client, donnees, eleves) {
  const parCle = new Map(eleves.map(e => [cle(e.nom, e.prenom, e.classe.nom), e]))
  const bilan = { ajoute: 0, eleves: 0, introuvables: [], exces: [], details: [] }

  for (const ligne of donnees) {
    const eleve = parCle.get(cle(ligne.nom, ligne.prenom, ligne.classe))
    if (!eleve) { bilan.introuvables.push(`${ligne.nom} ${ligne.prenom} (${ligne.classe})`); continue }

    const { ajouts, exces } = await synchroniserPaiementsCibles(client, eleve.id, {
      inscription: ligne.inscription, tranche1: ligne.tranche1, tranche2: ligne.tranche2, tranche3: ligne.tranche3
    })
    const total = ajouts.reduce((s, a) => s + a.montant, 0)
    if (total > 0) {
      bilan.ajoute += total
      bilan.eleves++
      bilan.details.push(`${eleve.matricule} ${eleve.nom} ${eleve.prenom} (${ligne.classe}) : +${fcfa(total)} [${ajouts.map(a => `${a.tranche} +${a.montant}`).join(', ')}]`)
    }
    exces.forEach(x => bilan.exces.push(`${eleve.matricule} ${eleve.nom} ${eleve.prenom} : ${fcfa(x.montant)} de ${x.tranche} dépassent le montant dû`))
  }
  return bilan
}

async function main() {
  console.log(DRY_RUN ? '### SIMULATION — aucune modification ###' : '### APPLICATION RÉELLE ###')
  const donnees = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cbm_complet.json'), 'utf-8'))
  const ecole = await prisma.ecole.findFirst({ where: { nomCourt: 'CBM' } })
  if (!ecole) throw new Error('École CBM introuvable')
  const eleves = await prisma.eleve.findMany({ where: { classe: { ecoleId: ecole.id } }, include: { classe: true } })

  const somme = async () => (await prisma.inscriptionFrais.aggregate({ where: { eleve: { classe: { ecoleId: ecole.id } } }, _sum: { montantPaye: true } }))._sum.montantPaye || 0
  const avant = await somme()
  const attendu = donnees.reduce((s, l) => s + l.totalPaye, 0)
  console.log(`Élèves CBM en base : ${eleves.length} | lignes du fichier : ${donnees.length}`)
  console.log(`Total payé en base : ${fcfa(avant)} | total payé selon le fichier : ${fcfa(attendu)}`)

  let bilan
  try {
    await prisma.$transaction(async (tx) => {
      bilan = await traiter(tx, donnees, eleves)
      if (DRY_RUN) throw ARRET_SIMULATION
    }, { timeout: 120000, maxWait: 30000 })
  } catch (e) {
    if (e !== ARRET_SIMULATION) throw e
  }

  bilan.details.forEach(d => console.log('  ' + d))
  console.log(`\nÉlèves corrigés : ${bilan.eleves} | montant ajouté : ${fcfa(bilan.ajoute)}`)
  console.log(`Élèves du fichier introuvables en base (${bilan.introuvables.length}) : ${bilan.introuvables.join(' ; ') || 'aucun'}`)
  console.log(`Montants dépassant le dû (${bilan.exces.length}) :`)
  bilan.exces.forEach(x => console.log('  ⚠️ ' + x))
  if (!DRY_RUN) {
    const apres = await somme()
    console.log(`\nTotal payé en base après : ${fcfa(apres)} (attendu au moins ${fcfa(avant)}, fichier ${fcfa(attendu)})`)
  }
}

main().catch(e => { console.error('ERREUR :', e.message); process.exit(1) }).finally(() => prisma.$disconnect())
