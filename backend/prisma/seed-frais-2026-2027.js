import { PrismaClient } from '@prisma/client'
import { synchroniserInscriptionsFrais, slugifier } from '../src/utils/inscriptionsFrais.js'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

function log(...args) {
  console.log(DRY_RUN ? '[DRY-RUN]' : '[APPLY]', ...args)
}

// Rétro-applique un barème fraîchement créé aux élèves déjà inscrits dans ses
// niveaux : crée la fiche si l'élève n'en avait aucune, ou CORRIGE le montant dû
// si l'élève avait déjà une fiche avec l'ancien montant placeholder (le montant
// déjà payé n'est jamais touché, seul montantDu et le statut sont recalculés).
async function appliquerAuxElevesExistants(config) {
  const postes = [
    { tranche: 'inscription', libelle: "Frais d'inscription", montant: config.montantInscription },
    ...config.fraisAnnexes.map(f => ({ tranche: `annexe_${slugifier(f.nom)}`, libelle: f.nom, montant: f.montant })),
    ...config.tranches.map(t => ({ tranche: `tranche${t.numero}`, libelle: `Tranche ${t.numero}`, montant: t.montant }))
  ]
  let nbElevesAffectes = 0
  for (const poste of postes) {
    nbElevesAffectes = await synchroniserInscriptionsFrais(prisma, config.id, poste.tranche, poste.libelle, poste.montant)
  }
  return nbElevesAffectes
}

async function creerBareme(ecole, { libelle, niveaux, montantInscription, fraisAnnexes = [], tranches = [] }) {
  const existant = await prisma.configurationFrais.findFirst({
    where: { ecoleId: ecole.id, libelle }
  })
  if (existant) {
    log(`${ecole.nomCourt} — barème "${libelle}" existe déjà, ignoré (corrections via l'interface).`)
    return
  }

  const totalAttendu = montantInscription + fraisAnnexes.reduce((s, f) => s + f.montant, 0) + tranches.reduce((s, t) => s + t.montant, 0)
  log(`${ecole.nomCourt} — barème "${libelle}" : niveaux [${niveaux.join(', ')}], total ${totalAttendu.toLocaleString('fr-FR')} FCFA`)

  if (DRY_RUN) return

  const config = await prisma.configurationFrais.create({
    data: {
      ecoleId: ecole.id,
      libelle,
      montantInscription,
      montantFraisTotal: totalAttendu,
      fraisAnnexes: { create: fraisAnnexes },
      tranches: { create: tranches.map((t, i) => ({ numero: i + 1, montant: t.montant, dateLimite: t.dateLimite || null })) },
      niveaux: { create: niveaux.map(niveau => ({ ecoleId: ecole.id, niveau })) }
    },
    include: { tranches: true, fraisAnnexes: true }
  })

  const nb = await appliquerAuxElevesExistants(config)
  if (nb > 0) log(`  → fiches de frais créées/corrigées pour ${nb} élève(s) déjà inscrit(s)`)
}

// Lie chaque niveau non encore couvert d'une école à sa ConfigurationFrais
// placeholder existante (ne modifie pas les montants) — indispensable pour que
// la résolution par niveau continue de fonctionner tant que les vraies données
// de cette école n'ont pas été fournies.
async function lierPlaceholder(ecole) {
  const config = await prisma.configurationFrais.findFirst({
    where: { ecoleId: ecole.id, libelle: null },
    include: { tranches: true, fraisAnnexes: true }
  })
  if (!config) {
    log(`${ecole.nomCourt} — aucune configuration placeholder trouvée, rien à lier.`)
    return
  }
  const classes = await prisma.classe.findMany({ where: { ecoleId: ecole.id } })
  const niveaux = Array.from(new Set(classes.map(c => c.niveau)))
  const dejaLies = await prisma.configurationFraisNiveau.findMany({ where: { ecoleId: ecole.id } })
  const niveauxLies = new Set(dejaLies.map(n => n.niveau))
  const aLier = niveaux.filter(n => !niveauxLies.has(n))

  if (aLier.length === 0) {
    log(`${ecole.nomCourt} — tous les niveaux sont déjà liés.`)
    return
  }
  log(`${ecole.nomCourt} — ACTION REQUISE : vrais tarifs en attente. Liaison des niveaux [${aLier.join(', ')}] au barème placeholder en attendant.`)
  if (DRY_RUN) return

  await prisma.configurationFraisNiveau.createMany({
    data: aLier.map(niveau => ({ configurationFraisId: config.id, ecoleId: ecole.id, niveau }))
  })
  const nb = await appliquerAuxElevesExistants(config)
  if (nb > 0) log(`  → fiches de frais créées/vérifiées pour ${nb} élève(s) déjà inscrit(s)`)
}

async function backfillLibelles() {
  const sansLibelle = await prisma.inscriptionFrais.findMany({ where: { libelle: null } })
  log(`Backfill libelle : ${sansLibelle.length} fiche(s) existante(s) sans libellé.`)
  if (DRY_RUN || sansLibelle.length === 0) return
  for (const f of sansLibelle) {
    const libelle = f.tranche === 'inscription'
      ? "Frais d'inscription"
      : /^tranche\d+$/.test(f.tranche)
        ? `Tranche ${f.tranche.replace('tranche', '')}`
        : f.tranche
    await prisma.inscriptionFrais.update({ where: { id: f.id }, data: { libelle } })
  }
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Application des vraies données de frais 2026/2027\n')

  await backfillLibelles()

  const ecoles = await prisma.ecole.findMany()
  const parNom = Object.fromEntries(ecoles.map(e => [e.nomCourt, e]))

  // ===== EBSB =====
  await creerBareme(parNom.EBSB, {
    libelle: 'Maternelle à CM2',
    niveaux: ['PS', 'MS', 'GS', 'SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
    montantInscription: 25000,
    tranches: [{ montant: 25000 }, { montant: 25000 }]
  })

  // ===== EBRP =====
  await creerBareme(parNom.EBRP, {
    libelle: 'Maternelle à CM2',
    niveaux: ['PS', 'MS', 'GS', 'SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
    montantInscription: 25000,
    tranches: [{ montant: 35000 }, { montant: 25000 }, { montant: 10000 }]
  })

  // ===== CRP FRANCOPHONE — Enseignement Général =====
  await creerBareme(parNom.CRP_FRANCOPHONE, {
    libelle: '6ème-5ème-4ème',
    niveaux: ['6ème', '5ème', '4ème'],
    montantInscription: 11000,
    fraisAnnexes: [{ nom: 'Livret Médical', montant: 1000 }, { nom: 'Info', montant: 5000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_FRANCOPHONE, {
    libelle: '3ème',
    niveaux: ['3ème'],
    montantInscription: 16500,
    fraisAnnexes: [{ nom: 'Livret Médical', montant: 1000 }, { nom: 'Info', montant: 5000 }, { nom: 'TD', montant: 5000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_FRANCOPHONE, {
    libelle: '2nde',
    niveaux: ['2nde'],
    montantInscription: 21000,
    fraisAnnexes: [{ nom: 'Livret Médical', montant: 1000 }, { nom: 'Info', montant: 5000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_FRANCOPHONE, {
    libelle: '1ère-Tle Littéraire',
    niveaux: ['1ère Littéraire', 'Tle Littéraire'],
    montantInscription: 21500,
    fraisAnnexes: [{ nom: 'Livret Médical', montant: 1000 }, { nom: 'Info', montant: 5000 }, { nom: 'TD', montant: 5000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_FRANCOPHONE, {
    libelle: '1ère-Tle Scientifique',
    niveaux: ['1ère Scientifique', 'Tle Scientifique'],
    montantInscription: 21500,
    fraisAnnexes: [{ nom: 'Livret Médical', montant: 1000 }, { nom: 'Info', montant: 5000 }, { nom: 'TD', montant: 5000 }, { nom: 'Lab', montant: 25000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })

  // ===== CRP ANGLOPHONE — Enseignement Général =====
  await creerBareme(parNom.CRP_ANGLOPHONE, {
    libelle: 'Form 1-2-3-4',
    niveaux: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
    montantInscription: 11000,
    fraisAnnexes: [{ nom: 'Med.', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_ANGLOPHONE, {
    libelle: 'Form 5',
    niveaux: ['Form 5'],
    montantInscription: 16500,
    fraisAnnexes: [{ nom: 'Med.', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_ANGLOPHONE, {
    // Écart de 1 000 F non expliqué entre le détail par poste (167 000 F) et le
    // total affiché sur le document (168 000 F) — détail gardé comme source de
    // vérité, à corriger si l'utilisateur précise le poste manquant.
    libelle: 'Lower Sixth Science',
    niveaux: ['Lower Sixth Science'],
    montantInscription: 21000,
    fraisAnnexes: [{ nom: 'Med.', montant: 1000 }, { nom: 'Lab', montant: 25000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_ANGLOPHONE, {
    libelle: 'Upper Sixth Arts',
    niveaux: ['Upper Sixth Arts'],
    montantInscription: 21000,
    fraisAnnexes: [{ nom: 'Med.', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_ANGLOPHONE, {
    // Même écart de 1 000 F que Lower Sixth Science, même traitement.
    libelle: 'Upper Sixth Science',
    niveaux: ['Upper Sixth Science'],
    montantInscription: 21500,
    fraisAnnexes: [{ nom: 'Med.', montant: 1000 }, { nom: 'Lab', montant: 25000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 20000 }]
  })

  // ===== CRP TECHNIQUE — Industriel =====
  await creerBareme(parNom.CRP_TECHNIQUE, {
    libelle: 'Industriel 1ère Année',
    niveaux: ['Industriel 1ère Année'],
    montantInscription: 20000,
    fraisAnnexes: [{ nom: "Matière d'Œuvre", montant: 30000 }, { nom: 'Trousse', montant: 25000 }, { nom: 'Livret', montant: 1000 }],
    tranches: [{ montant: 60000 }, { montant: 50000 }, { montant: 20000 }]
  })
  await creerBareme(parNom.CRP_TECHNIQUE, {
    // "Prévoir en supplément les frais de stage pour les élèves en 4ème année" —
    // non chiffré dans le document, aucun poste créé pour ce montant.
    libelle: 'Industriel 2è-4è Année',
    niveaux: ['Industriel 2è-4è Année'],
    montantInscription: 25000,
    fraisAnnexes: [{ nom: "Matière d'Œuvre", montant: 30000 }, { nom: 'Trousse', montant: 25000 }, { nom: 'Livret', montant: 1000 }],
    tranches: [{ montant: 60000 }, { montant: 50000 }, { montant: 20000 }]
  })

  // ===== CRP TECHNIQUE — Commercial Francophone =====
  await creerBareme(parNom.CRP_TECHNIQUE, {
    libelle: 'Commercial Francophone 1ère Année',
    niveaux: ['Commercial Francophone 1ère Année'],
    montantInscription: 20000,
    fraisAnnexes: [{ nom: "Matière d'Œuvre", montant: 15000 }, { nom: 'Trousse', montant: 25000 }, { nom: 'Livret', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 10000 }]
  })
  await creerBareme(parNom.CRP_TECHNIQUE, {
    libelle: 'Commercial Francophone 2è-4è Année',
    niveaux: ['Commercial Francophone 2è-4è Année'],
    montantInscription: 25000,
    fraisAnnexes: [{ nom: "Matière d'Œuvre", montant: 20000 }, { nom: 'Trousse', montant: 25000 }, { nom: 'Livret', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 10000 }]
  })

  // ===== CRP TECHNIQUE — Commercial Anglophone =====
  await creerBareme(parNom.CRP_TECHNIQUE, {
    libelle: 'Commercial Anglophone 1ère Année',
    niveaux: ['Commercial Anglophone 1ère Année'],
    montantInscription: 20000,
    fraisAnnexes: [{ nom: "Matière d'Œuvre", montant: 30000 }, { nom: 'Trousse', montant: 25000 }, { nom: 'Livret', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 10000 }]
  })
  await creerBareme(parNom.CRP_TECHNIQUE, {
    libelle: 'Commercial Anglophone 2è-4è Année',
    niveaux: ['Commercial Anglophone 2è-4è Année'],
    montantInscription: 25000,
    fraisAnnexes: [{ nom: "Matière d'Œuvre", montant: 30000 }, { nom: 'Trousse', montant: 25000 }, { nom: 'Livret', montant: 1000 }],
    tranches: [{ montant: 50000 }, { montant: 50000 }, { montant: 10000 }]
  })

  // ===== CBM — en attente des vraies données =====
  await lierPlaceholder(parNom.CBM)

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
