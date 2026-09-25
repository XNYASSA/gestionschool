import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { importerLignesEleves } from '../src/utils/importEleves.js'
import { construireGroupes } from '../../frontend/src/utils/grouperScolarite.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const chemin = process.argv.find(a => a.endsWith('.json'))

// Importe les élèves et les montants déjà payés des fichiers de scolarité des secrétaires (une feuille par
// classe), extraits au préalable en JSON. Mêmes règles que l'écran « Importer des élèves » :
//  - la classe de chaque feuille est reconnue automatiquement ; un groupe douteux (classe non reconnue,
//    groupe minoritaire d'une feuille, pension ne correspondant à aucun barème) n'est PAS importé et est listé ;
//  - le parent et le téléphone absents sont enregistrés « Non renseigné » (signalés en rouge dans l'application) ;
//  - un élève déjà présent (nom + prénom + classe) est mis à jour, sans doublon, et ne perd rien de ce qu'il a payé.

const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`

async function main() {
  console.log(DRY_RUN ? '### SIMULATION — aucune modification ###' : '### IMPORT RÉEL ###')
  const fichiers = JSON.parse(fs.readFileSync(chemin, 'utf-8'))

  const classesDb = await prisma.classe.findMany({ include: { ecole: true } })
  const classes = classesDb.map(c => ({ id: c.id, nom: c.nom, niveau: c.niveau, ecoleId: c.ecoleId, ecoleNom: c.ecole.nomCourt }))
  const liens = await prisma.configurationFraisNiveau.findMany({ include: { configurationFrais: true } })
  const totaux = {}
  liens.forEach(l => { totaux[`${l.ecoleId}|${l.niveau}`] = l.configurationFrais.montantFraisTotal })

  for (const { fichier, ecoleNom, feuilles } of fichiers) {
    const ecole = await prisma.ecole.findFirst({ where: { nomCourt: ecoleNom } })
    console.log(`\n=== ${fichier} → ${ecoleNom} ===`)
    if (!ecole) { console.log('  École absente : fichier ignoré'); continue }

    const groupes = construireGroupes(feuilles, classes.filter(c => c.ecoleId === ecole.id), ecole.id, totaux)
    const retenus = groupes.filter(g => g.suggestion && !g.aVerifier)
    const ignores = groupes.filter(g => !(g.suggestion && !g.aVerifier))

    retenus.forEach(g => console.log(`  ✓ feuille « ${g.feuille.trim()} » [${g.classeTexte || '-'}] → ${g.suggestion.nom} : ${g.eleves.length} élève(s), ${fcfa(g.paye)}`))
    ignores.forEach(g => console.log(`  ✗ NON IMPORTÉ feuille « ${g.feuille.trim()} » [${g.classeTexte || '-'}] : ${g.eleves.length} élève(s), ${fcfa(g.paye)} — ${g.motif || (g.aVerifier ? 'groupe minoritaire à confirmer' : 'classe non reconnue')}${g.suggestion ? ` (suggestion : ${g.suggestion.nom})` : ''} : ${g.eleves.map(e => `${e.nomComplet} (ligne ${e.ligneExcel})`).join(', ')}`))

    const lignes = retenus.flatMap(g => g.eleves.map(e => ({
      matricule: e.matricule, nom: e.nom, prenom: e.prenom, classe: g.suggestion.nom,
      inscription: String(e.inscription || ''), tranche1: String(e.tranche1 || ''), tranche2: String(e.tranche2 || ''), tranche3: String(e.tranche3 || '')
    })))
    const attendu = retenus.reduce((s, g) => s + g.paye, 0)
    const avant = await prisma.eleve.count({ where: { classe: { ecoleId: ecole.id } } })
    console.log(`  Élèves à importer : ${lignes.length} (${fcfa(attendu)} payés dans le fichier) — élèves actuellement dans l'école : ${avant}`)
    if (DRY_RUN) continue

    const resultats = await importerLignesEleves(prisma, ecole.id, lignes)
    const echecs = resultats.filter(r => !r.succes)
    console.log(`  Résultat : ${resultats.filter(r => r.succes && /créé/.test(r.message)).length} créé(s), ${resultats.filter(r => r.succes && /mis à jour/.test(r.message)).length} mis à jour, ${echecs.length} en erreur, ${resultats.filter(r => r.infosManquantes).length} à compléter (parent/téléphone)`)
    echecs.forEach(r => console.log('   ⚠ ' + r.message))
    resultats.filter(r => r.succes && /attention|aucun barème|déjà pris/.test(r.message)).forEach(r => console.log('   ⚠ ' + r.message))

    const apres = await prisma.eleve.count({ where: { classe: { ecoleId: ecole.id } } })
    const paye = (await prisma.inscriptionFrais.aggregate({ where: { eleve: { classe: { ecoleId: ecole.id } } }, _sum: { montantPaye: true } }))._sum.montantPaye || 0
    console.log(`  Après import : ${apres} élève(s) dans l'école, total payé enregistré ${fcfa(paye)}`)
  }
}

main().catch(e => { console.error('ERREUR', e); process.exit(1) }).finally(() => prisma.$disconnect())
