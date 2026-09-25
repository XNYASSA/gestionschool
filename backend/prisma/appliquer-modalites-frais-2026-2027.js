import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { slugifier, calculerStatut, categoriserPoste } from '../src/utils/inscriptionsFrais.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Applique les modalités de frais du fichier Modalites_Frais_Scolaires_2026_2027.xlsx
// (extraites dans modalites_frais_v2.json) aux barèmes et aux élèves déjà inscrits.
//
// Règles :
//  - tous les montants viennent du fichier (aucune valeur retapée ici) ;
//  - l'inscription du barème = frais d'inscription + livret médical ;
//  - les autres frais (informatique, TD, matière d'œuvre, laboratoire, trousse) restent
//    des frais annexes nommés ; un frais absent du fichier est retiré du barème ;
//  - ce qu'un élève a déjà payé n'est JAMAIS modifié ni supprimé : un poste retiré du
//    barème qui a reçu un paiement est conservé et signalé ;
//  - un niveau de classe n'est jamais délié d'un barème sans être relié à un autre.

const lignes = JSON.parse(fs.readFileSync(path.join(__dirname, '../../modalites_frais_v2.json'), 'utf-8'))
const ligneParNumero = new Map(lignes.map(l => [l.ligne, l]))

// École de l'application, ligne(s) du fichier, libellé du barème et niveaux de classe concernés.
// "attendu" protège contre un fichier dont les lignes auraient bougé.
const SPECS = [
  // ===== CBM = Collège Bilingue Les Masters =====
  { ecole: 'CBM', lignes: [35], attendu: '6è - 5è - 4è', libelle: '6è - 5è - 4è', niveaux: ['6ème', '5ème', '4ème Espagnol', '4ème Allemand'] },
  { ecole: 'CBM', lignes: [36], attendu: '3è', libelle: '3è', niveaux: ['3ème Espagnol', '3ème Allemand'] },
  { ecole: 'CBM', lignes: [37], attendu: '2nde A4 & C', libelle: '2nde A4 & C', niveaux: ['2nde Espagnol', '2nde Allemand', '2nde C'] },
  { ecole: 'CBM', lignes: [38], attendu: '1ère & Tle', libelle: '1ère & Tle (A C D)', niveaux: ['1ère Espagnol', '1ère Allemand', '1ère D', '1ère C', 'Tle Espagnol', 'Tle Allemand', 'Tle D', 'Tle C'] },

  // ===== CRP Francophone — enseignement secondaire général =====
  { ecole: 'CRP_FRANCOPHONE', lignes: [10], attendu: '6è - 5è - 4è', libelle: '6è - 5è - 4è', niveaux: ['6ème', '5ème', '4ème'] },
  { ecole: 'CRP_FRANCOPHONE', lignes: [11], attendu: '3è', libelle: '3è', niveaux: ['3ème'] },
  { ecole: 'CRP_FRANCOPHONE', lignes: [12], attendu: '2nde', libelle: '2nde', niveaux: ['2nde', 'seconde', 'Seconde'] },
  { ecole: 'CRP_FRANCOPHONE', lignes: [13], attendu: '1ère - Tle', libelle: '1ère - Tle', niveaux: ['1ère Littéraire', 'Tle Littéraire', 'première', 'Terminale'] },
  // 1ère/Tle Scientifique : absentes du fichier, leur barème actuel (avec laboratoire) est conservé tel quel

  // ===== CRP Technique Francophone — industriel et commercial (2è à 4è année au même tarif) =====
  { ecole: 'CRP_TECHNIQUE FRANCOPHONE', lignes: [14], attendu: '1ère Année', libelle: 'Industriel 1ère Année', niveaux: ['Industriel 1ère Année'] },
  { ecole: 'CRP_TECHNIQUE FRANCOPHONE', lignes: [15, 16, 17], attendu: 'Année', libelle: 'Industriel 2è-4è Année', niveaux: ['Industriel 2ème Année', 'Industriel 3ème Année', 'Industriel 4ème Année'] },
  { ecole: 'CRP_TECHNIQUE FRANCOPHONE', lignes: [18], attendu: '1ère Année', libelle: 'Commercial 1ère Année', niveaux: ['Commercial 1ère Année'] },
  { ecole: 'CRP_TECHNIQUE FRANCOPHONE', lignes: [19, 20, 21], attendu: 'Année', libelle: 'Commercial 2è-4è Année', niveaux: ['Commercial 2ème Année', 'Commercial 3ème Année', 'Commercial 4ème Année'] },

  // ===== CRP Anglophone Technical =====
  { ecole: 'CRP_ANGLOPHONE TECHNICAL', lignes: [27], attendu: 'Year 1', libelle: 'Industrial Year 1', niveaux: ['Industrial Year 1'] },
  { ecole: 'CRP_ANGLOPHONE TECHNICAL', lignes: [28, 29, 30], attendu: 'Year', libelle: 'Industrial Year 2-4', niveaux: ['Industrial Year 2', 'Industrial Year 3', 'Industrial Year 4'] },
  { ecole: 'CRP_ANGLOPHONE TECHNICAL', lignes: [31], attendu: 'Year 1', libelle: 'Commercial Year 1', niveaux: ['Commercial Year 1'] },
  { ecole: 'CRP_ANGLOPHONE TECHNICAL', lignes: [32, 33, 34], attendu: 'Year', libelle: 'Commercial Year 2-4', niveaux: ['Commercial Year 2', 'Commercial Year 3', 'Commercial Year 4'] },

  // ===== CRP Anglophone Général (Rosa Parks College) =====
  { ecole: 'CRP_ANGLOPHONE GENERAL', lignes: [22], attendu: 'Form 1 2 3 4', libelle: 'Form 1 2 3 4', niveaux: ['FORM ONE', 'FORM TWO', 'FORM THREE', 'FORM FOUR', 'FORM FOUR ART', 'FORM FOUR SCIENCE'] },
  { ecole: 'CRP_ANGLOPHONE GENERAL', lignes: [23], attendu: 'Form 5', libelle: 'Form 5', niveaux: ['FORM FIVE ART', 'FORM FIVE SCIENCE'] },
  { ecole: 'CRP_ANGLOPHONE GENERAL', lignes: [24], attendu: 'L6 Scs', libelle: 'L6 Scs', niveaux: ['L6SC'] },
  { ecole: 'CRP_ANGLOPHONE GENERAL', lignes: [25], attendu: 'U6 Arts', libelle: 'U6 Arts', niveaux: ['U6A', 'L6A'] },
  { ecole: 'CRP_ANGLOPHONE GENERAL', lignes: [26], attendu: 'U6 Scs', libelle: 'U6 Scs', niveaux: ['U6SC'] },

  // ===== GSB Steve Biko : la 2ème tranche anglophone (08/12) diffère de la francophone (08/11) =====
  { ecole: 'GSB STEVE BIKO', lignes: [4], attendu: 'Maternelle au CM2', libelle: 'Maternelle au CM2 (Francophone)', niveaux: ['MAT1', 'MAT2', 'SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { ecole: 'GSB STEVE BIKO', lignes: [5], attendu: 'Pré-Maternelle', libelle: 'Pré-Maternelle (Francophone)', niveaux: ['PMAT'] },
  { ecole: 'GSB STEVE BIKO', lignes: [2], attendu: 'From Nursery to class 6', libelle: 'Nursery to Class 6 (Anglophone)', niveaux: ['N1', 'N2', 'CL1', 'CL2', 'CL3', 'CL4', 'CL5', 'CL6'] },
  { ecole: 'GSB STEVE BIKO', lignes: [3], attendu: 'Pre-nursery', libelle: 'Pre-nursery (Anglophone)', niveaux: ['PN'] },

  // ===== GSB Rosa Parks : mêmes montants et dates en francophone et en anglophone =====
  { ecole: 'GSB ROSA PARKS', lignes: [8, 6], attendu: 'CM2|class 6', libelle: 'Maternelle au CM2 / Nursery to Class 6', niveaux: ['Maternelle Première année', 'Maternelle deuxième année', 'SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'N1', 'N2', 'C1', 'CL2', 'CL3', 'CL4', 'CL5', 'CL6'] },
  { ecole: 'GSB ROSA PARKS', lignes: [9, 7], attendu: 'Pré-Maternelle|Pre-nursery', libelle: 'Pré-Maternelle / Pre-nursery', niveaux: ['Pré-Maternelle', 'PN'] }
]

const ANNEXES = [
  { nom: 'Info', champ: 'informatique' },
  { nom: 'TD', champ: 'td' },
  { nom: "Matière d'Œuvre", champ: 'matiereOeuvre' },
  { nom: 'Trousse', champ: 'trousse' },
  { nom: 'Lab', champ: 'labo' }
]
const CHAMPS_PRIX = ['inscription', 'informatique', 'td', 'matiereOeuvre', 'trousse', 'labo', 'livret', 't1', 't2', 't3', 'horsRameFichier', 'dateT1', 'dateT2', 'dateT3']

const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`
const estDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s))
const versDate = (s) => (estDate(s) ? new Date(`${s}T00:00:00.000Z`) : null)
const jour = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-')

// Valeurs du barème calculées à partir des lignes du fichier (toutes identiques entre elles)
function valeursBareme(spec) {
  const rows = spec.lignes.map(n => {
    const r = ligneParNumero.get(n)
    if (!r) throw new Error(`Ligne ${n} introuvable dans le fichier de modalités`)
    const motif = new RegExp(spec.attendu, 'i')
    if (!motif.test(r.classe)) throw new Error(`Ligne ${n} : classe « ${r.classe} » ne correspond pas à « ${spec.attendu} » — fichier modifié ?`)
    return r
  })
  let ref = rows[0]
  if (spec.correction) {
    const { champ, fichier, valeur } = spec.correction
    if (ref[champ] !== fichier) throw new Error(`Ligne ${ref.ligne} : ${champ} = ${ref[champ]} dans le fichier, ${fichier} attendu pour la correction — fichier mis à jour ?`)
    ref = { ...ref, [champ]: valeur, horsRameFichier: ref.horsRameFichier + valeur - fichier }
  }
  rows.slice(1).forEach(r => {
    const diff = CHAMPS_PRIX.filter(k => JSON.stringify(r[k]) !== JSON.stringify(ref[k]))
    // Les dates de la 3ème tranche ne comptent que si la tranche existe
    if (diff.length > 0) throw new Error(`Lignes ${spec.lignes.join('+')} : montants différents (${diff.join(', ')}) alors qu'elles sont regroupées dans un même barème`)
  })

  const pension = ref.t1 + ref.t2 + ref.t3
  const autres = ANNEXES.reduce((s, a) => s + ref[a.champ], 0)
  if (ref.inscription + autres + ref.livret + pension !== ref.horsRameFichier) {
    throw new Error(`Ligne ${ref.ligne} : total du fichier (${ref.horsRameFichier}) ≠ inscription + autres + livret + pension`)
  }

  return {
    montantInscription: ref.inscription + ref.livret,
    montantFraisTotal: ref.horsRameFichier,
    dateLimiteInscription: versDate(ref.dateInscription),
    annexes: ANNEXES.filter(a => ref[a.champ] > 0).map(a => ({ nom: a.nom, montant: ref[a.champ] })),
    tranches: [ref.t1, ref.t2, ref.t3]
      .map((montant, i) => ({ numero: i + 1, montant, dateLimite: versDate([ref.dateT1, ref.dateT2, ref.dateT3][i]) }))
      .filter(t => t.montant > 0)
  }
}

const resumeBareme = (insc, annexes, tranches) =>
  `inscription ${fcfa(insc)}` +
  (annexes.length ? ` + ${annexes.map(a => `${a.nom} ${fcfa(a.montant)}`).join(', ')}` : '') +
  ` | ${tranches.map(t => `T${t.numero} ${fcfa(t.montant)} (${jour(t.dateLimite)})`).join(', ')}`

// Postes attendus pour un élève d'après le barème (mêmes clés que creerInscriptionsFraisPourEleve)
function postesAttendus(val) {
  return [
    { tranche: 'inscription', libelle: "Frais d'inscription", montant: val.montantInscription },
    ...val.annexes.map(a => ({ tranche: `annexe_${slugifier(a.nom)}`, libelle: a.nom, montant: a.montant })),
    ...val.tranches.map(t => ({ tranche: `tranche${t.numero}`, libelle: `Tranche ${t.numero}`, montant: t.montant }))
  ]
}

async function chargerEtat() {
  const etat = new Map()
  for (const ecole of await prisma.ecole.findMany()) {
    etat.set(ecole.nomCourt, {
      ecole,
      configs: await prisma.configurationFrais.findMany({
        where: { ecoleId: ecole.id },
        include: { niveaux: true, tranches: true, fraisAnnexes: true },
        orderBy: { createdAt: 'asc' }
      }),
      classes: await prisma.classe.findMany({ where: { ecoleId: ecole.id } })
    })
  }
  return etat
}

const stats = { baremesCrees: 0, baremesMisAJour: 0, baremesSupprimes: 0, elevesTouches: 0, postesCrees: 0, postesMisAJour: 0, postesSupprimes: 0, montantReporte: 0 }
const alertes = []

async function traiterEcole(client, nomCourt, etatEcole, specsEcole) {
  const { ecole, configs, classes } = etatEcole
  const utilisees = new Set()
  const niveauxRevendiques = new Set(specsEcole.flatMap(s => s.niveaux))

  console.log(`\n=== ${nomCourt} ===`)

  for (const spec of specsEcole) {
    const val = valeursBareme(spec)

    // Barème existant le plus concerné par ces niveaux (jamais un barème déjà réutilisé)
    let candidat = null
    let meilleur = 0
    for (const c of configs) {
      if (utilisees.has(c.id)) continue
      const recouvrement = c.niveaux.filter(n => spec.niveaux.includes(n.niveau)).length
      if (recouvrement > meilleur) { meilleur = recouvrement; candidat = c }
    }
    if (candidat) utilisees.add(candidat.id)

    if (candidat) {
      const ancien = resumeBareme(candidat.montantInscription, candidat.fraisAnnexes.map(a => ({ nom: a.nom, montant: a.montant })),
        [...candidat.tranches].sort((a, b) => a.numero - b.numero).map(t => ({ numero: t.numero, montant: t.montant, dateLimite: t.dateLimite })))
      console.log(`- "${spec.libelle}" ← barème existant "${candidat.libelle}"`)
      console.log(`    avant : ${ancien}`)
    } else {
      console.log(`- "${spec.libelle}" ← NOUVEAU barème`)
    }
    console.log(`    après : ${resumeBareme(val.montantInscription, val.annexes, val.tranches)} | total ${fcfa(val.montantFraisTotal)}`)
    console.log(`    niveaux : ${spec.niveaux.join(', ')}`)

    const nomsClasses = new Set(classes.map(c => c.niveau))
    const sansClasse = spec.niveaux.filter(n => !nomsClasses.has(n))
    if (sansClasse.length) console.log(`    (aucune classe actuellement pour : ${sansClasse.join(', ')})`)

    // ---- Barème, tranches, annexes, niveaux ----
    let configId = candidat?.id
    if (!DRY_RUN) {
      const donnees = {
        libelle: spec.libelle,
        montantInscription: val.montantInscription,
        montantFraisTotal: val.montantFraisTotal,
        dateLimiteInscription: val.dateLimiteInscription
      }
      const config = candidat
        ? await client.configurationFrais.update({ where: { id: candidat.id }, data: donnees })
        : await client.configurationFrais.create({ data: { ecoleId: ecole.id, ...donnees } })
      configId = config.id

      // Ces niveaux appartiennent désormais à ce barème
      await client.configurationFraisNiveau.deleteMany({ where: { ecoleId: ecole.id, niveau: { in: spec.niveaux }, configurationFraisId: { not: configId } } })
      const dejaLies = new Set((await client.configurationFraisNiveau.findMany({ where: { configurationFraisId: configId } })).map(n => n.niveau))
      const aLier = spec.niveaux.filter(n => !dejaLies.has(n))
      if (aLier.length) await client.configurationFraisNiveau.createMany({ data: aLier.map(niveau => ({ configurationFraisId: configId, ecoleId: ecole.id, niveau })) })

      for (const t of val.tranches) {
        await client.tranche.upsert({
          where: { configurationFraisId_numero: { configurationFraisId: configId, numero: t.numero } },
          create: { configurationFraisId: configId, numero: t.numero, montant: t.montant, dateLimite: t.dateLimite },
          update: { montant: t.montant, dateLimite: t.dateLimite }
        })
      }
      await client.tranche.deleteMany({ where: { configurationFraisId: configId, numero: { notIn: val.tranches.map(t => t.numero) } } })

      for (const a of val.annexes) {
        await client.fraisAnnexe.upsert({
          where: { configurationFraisId_nom: { configurationFraisId: configId, nom: a.nom } },
          create: { configurationFraisId: configId, nom: a.nom, montant: a.montant },
          update: { montant: a.montant }
        })
      }
      await client.fraisAnnexe.deleteMany({ where: { configurationFraisId: configId, nom: { notIn: val.annexes.map(a => a.nom) } } })
    }
    if (candidat) stats.baremesMisAJour++; else stats.baremesCrees++

    // ---- Élèves déjà inscrits : alignement des montants dus, paiements intacts ----
    const eleves = await client.eleve.findMany({
      where: { classe: { ecoleId: ecole.id, niveau: { in: spec.niveaux } } },
      include: { inscriptionsFrais: { include: { paiements: { select: { id: true } } } } }
    })
    const attendus = postesAttendus(val)
    let touches = 0
    for (const eleve of eleves) {
      const qui = `${nomCourt} — ${eleve.matricule} ${eleve.nom} ${eleve.prenom}`
      let modifie = false
      const etatPostes = []

      for (const poste of attendus) {
        const existante = eleve.inscriptionsFrais.find(p => p.tranche === poste.tranche)
        if (!existante) {
          modifie = true; stats.postesCrees++
          etatPostes.push({ ...poste, id: null, du: poste.montant, paye: 0, nouveau: true, change: true })
        } else {
          const change = existante.montantDu !== poste.montant || existante.libelle !== poste.libelle
          if (change) { modifie = true; stats.postesMisAJour++ }
          etatPostes.push({ ...poste, id: existante.id, du: poste.montant, paye: existante.montantPaye, change })
        }
      }

      // Un versement fait sur l'inscription alors qu'elle incluait un frais devenu poste à part
      // (ex. TD) est reporté sur ce poste : le total payé de l'élève ne change pas.
      const annexes = etatPostes.filter(p => categoriserPoste(p.tranche) === 'FRAIS_ANNEXE')
      for (const source of etatPostes.filter(p => p.tranche === 'inscription' && p.paye > p.du)) {
        for (const cible of annexes) {
          const transfert = Math.min(source.paye - source.du, cible.du - cible.paye)
          if (transfert <= 0) continue
          source.paye -= transfert; cible.paye += transfert
          source.change = cible.change = true
          modifie = true
          stats.montantReporte += transfert
        }
      }
      for (const p of etatPostes.filter(x => x.paye > x.du)) {
        alertes.push(`${qui} : « ${p.libelle} » payé ${fcfa(p.paye)} > nouveau montant dû ${fcfa(p.du)} (trop-perçu, conservé)`)
      }

      if (!DRY_RUN) {
        for (const p of etatPostes.filter(x => x.change)) {
          if (p.nouveau) {
            await client.inscriptionFrais.create({ data: { eleveId: eleve.id, tranche: p.tranche, libelle: p.libelle, montantDu: p.du, montantPaye: p.paye, statut: calculerStatut(p.du, p.paye), statutValidation: 'VALIDE' } })
          } else {
            await client.inscriptionFrais.update({ where: { id: p.id }, data: { montantDu: p.du, montantPaye: p.paye, libelle: p.libelle, statut: calculerStatut(p.du, p.paye) } })
          }
        }
      }

      const clesAttendues = new Set(attendus.map(p => p.tranche))
      for (const p of eleve.inscriptionsFrais.filter(x => !clesAttendues.has(x.tranche))) {
        modifie = true
        if (p.montantPaye > 0 || p.paiements.length > 0) {
          alertes.push(`${qui} : poste « ${p.libelle || p.tranche} » retiré du barème mais déjà payé ${fcfa(p.montantPaye)} : CONSERVÉ tel quel`)
        } else {
          stats.postesSupprimes++
          if (!DRY_RUN) await client.inscriptionFrais.delete({ where: { id: p.id } })
        }
      }
      if (modifie) touches++
    }
    stats.elevesTouches += touches
    console.log(`    élèves concernés : ${eleves.length} (fiches de frais ajustées pour ${touches})`)
  }

  // ---- Barèmes de l'école que le fichier ne couvre plus et qui n'ont plus aucun niveau ----
  for (const c of configs.filter(x => !utilisees.has(x.id))) {
    const restants = c.niveaux.map(n => n.niveau).filter(n => !niveauxRevendiques.has(n))
    if (restants.length === 0) {
      console.log(`- barème "${c.libelle}" : plus aucun niveau (repris par le fichier) → supprimé`)
      stats.baremesSupprimes++
      if (!DRY_RUN) await client.configurationFrais.delete({ where: { id: c.id } })
    } else {
      console.log(`- barème "${c.libelle}" conservé tel quel (niveaux non listés dans le fichier : ${restants.join(', ')})`)
    }
  }
}

async function main() {
  console.log(DRY_RUN ? '### SIMULATION — aucune modification ###' : '### APPLICATION RÉELLE ###')
  const etat = await chargerEtat()

  const parEcole = new Map()
  for (const spec of SPECS) {
    if (!etat.has(spec.ecole)) { console.log(`\n(école "${spec.ecole}" absente de cette base, ignorée)`); continue }
    if (!parEcole.has(spec.ecole)) parEcole.set(spec.ecole, [])
    parEcole.get(spec.ecole).push(spec)
  }

  const nonCouvertes = [...etat.keys()].filter(n => !parEcole.has(n))
  if (nonCouvertes.length) console.log(`
Écoles de la base NON traitées par ce fichier : ${nonCouvertes.join(', ')}`)

  for (const [nomCourt, specsEcole] of parEcole) {
    if (DRY_RUN) {
      await traiterEcole(prisma, nomCourt, etat.get(nomCourt), specsEcole)
    } else {
      await prisma.$transaction(client => traiterEcole(client, nomCourt, etat.get(nomCourt), specsEcole), { timeout: 180000, maxWait: 30000 })
    }
  }

  console.log('\n=== BILAN ===')
  console.log(`Barèmes : ${stats.baremesMisAJour} mis à jour, ${stats.baremesCrees} créés, ${stats.baremesSupprimes} supprimés`)
  console.log(`Élèves : ${stats.elevesTouches} fiche(s) ajustée(s) — postes : ${stats.postesCrees} créés, ${stats.postesMisAJour} mis à jour, ${stats.postesSupprimes} supprimés
Montant reporté de l'inscription vers un frais annexe devenu poste à part : ${fcfa(stats.montantReporte)} (total payé inchangé)`)
  console.log(`\nALERTES (${alertes.length}) :`)
  alertes.forEach(a => console.log(`  ⚠️ ${a}`))

  // ---- Contrôle final : classes sans barème, élèves sans aucun poste ----
  if (!DRY_RUN) {
    console.log('\n=== CONTRÔLE FINAL ===')
    for (const ecole of await prisma.ecole.findMany({ orderBy: { nomCourt: 'asc' } })) {
      const liens = new Set((await prisma.configurationFraisNiveau.findMany({ where: { ecoleId: ecole.id } })).map(n => n.niveau))
      const classes = await prisma.classe.findMany({ where: { ecoleId: ecole.id } })
      const sansBareme = classes.filter(c => !liens.has(c.niveau))
      if (sansBareme.length) console.log(`  ${ecole.nomCourt} : classes sans barème → ${sansBareme.map(c => `${c.nom}[${c.niveau}]`).join(', ')}`)
    }
    const sansPoste = await prisma.eleve.count({ where: { inscriptionsFrais: { none: {} } } })
    console.log(`  Élèves sans aucun poste de frais : ${sansPoste}`)
  }
}

main()
  .catch(e => { console.error('\nERREUR — rien n\'a été laissé à moitié appliqué pour l\'école en cours :', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
