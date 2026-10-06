import { baremeEcole, mentionPourNote } from './baremeNotation.js'

// Un trimestre n'a pas de dates fixées dans l'application (aucune école n'en a encore donné) : ces
// plages sont une hypothèse par défaut pour compter les absences/retards de la période, à confirmer
// avec chaque établissement (le calendrier réel peut décaler ces dates de quelques jours ou semaines).
export function plageTrimestre(anneeScolaire, trimestre) {
  const [debut, fin] = anneeScolaire.split('-').map(Number)
  if (trimestre === 1) return { debut: new Date(Date.UTC(debut, 8, 1)), fin: new Date(Date.UTC(debut, 11, 20, 23, 59, 59)) }
  if (trimestre === 2) return { debut: new Date(Date.UTC(fin, 0, 3)), fin: new Date(Date.UTC(fin, 2, 31, 23, 59, 59)) }
  return { debut: new Date(Date.UTC(fin, 3, 1)), fin: new Date(Date.UTC(fin, 5, 30, 23, 59, 59)) }
}

const moyenne2 = (a, b) => {
  const valeurs = [a, b].filter(v => v !== null && v !== undefined)
  return valeurs.length ? Number((valeurs.reduce((s, v) => s + v, 0) / valeurs.length).toFixed(2)) : null
}

// Résultats d'un élève pour un trimestre : notes par matière (Eval1/Eval2/Note/Coef/NxC/APC/Mention),
// regroupées par matiere.departement (le "GROUPE" du bulletin — à défaut de département, un groupe
// unique "PROGRAMME"), plus les moyennes générale et par évaluation.
export async function resultatsEleve(prisma, classe, eleveId, trimestre, anneeScolaire, bareme) {
  const programme = await prisma.classeMatiere.findMany({ where: { classeId: classe.id }, include: { matiere: true } })

  const [notesEval, affectations] = await Promise.all([
    prisma.noteEvaluation.findMany({ where: { eleveId, anneeScolaire, trimestre: parseInt(trimestre), matiereId: { in: programme.map(p => p.matiereId) } } }),
    prisma.enseignantClasseMatiere.findMany({ where: { classeId: classe.id }, include: { enseignant: { include: { utilisateur: { select: { nom: true } } } } } })
  ])

  const notesParMatiere = new Map()
  notesEval.forEach(n => {
    if (!notesParMatiere.has(n.matiereId)) notesParMatiere.set(n.matiereId, {})
    notesParMatiere.get(n.matiereId)[n.evaluation] = n.valeur
  })
  const enseignantParMatiere = new Map()
  affectations.forEach(a => { if (!enseignantParMatiere.has(a.matiereId)) enseignantParMatiere.set(a.matiereId, a.enseignant.utilisateur.nom) })

  const lignes = programme.map(p => {
    const n = notesParMatiere.get(p.matiereId) || {}
    const eval1 = n[1] ?? null
    const eval2 = n[2] ?? null
    const note = moyenne2(eval1, eval2)
    const nxc = note !== null ? Number((note * p.coefficient).toFixed(2)) : null
    const mention = mentionPourNote(bareme.lignes, note)
    return {
      matiereId: p.matiereId,
      matiere: p.matiere.nom,
      enseignant: enseignantParMatiere.get(p.matiereId) || null,
      groupe: p.matiere.departement || 'PROGRAMME',
      eval1, eval2, note, coefficient: p.coefficient, nxc,
      apc: mention?.apc || '',
      mention: mention?.mentionFr || '',
      mentionEn: mention?.mentionEn || ''
    }
  }).sort((a, b) => a.matiere.localeCompare(b.matiere))

  const parGroupe = new Map()
  lignes.forEach(l => { if (!parGroupe.has(l.groupe)) parGroupe.set(l.groupe, []); parGroupe.get(l.groupe).push(l) })
  const groupes = [...parGroupe.entries()].map(([nom, lignesGroupe], index) => {
    const notees = lignesGroupe.filter(l => l.note !== null)
    const coefTotal = notees.reduce((s, l) => s + l.coefficient, 0)
    const nxcTotal = Number(notees.reduce((s, l) => s + l.nxc, 0).toFixed(2))
    const moyenneGroupe = coefTotal > 0 ? Number((nxcTotal / coefTotal).toFixed(2)) : null
    const mentionGroupe = mentionPourNote(bareme.lignes, moyenneGroupe)
    return { numero: index + 1, nom, lignes: lignesGroupe, coefTotal, nxcTotal, moyenne: moyenneGroupe, mention: mentionGroupe?.mentionFr || '', mentionEn: mentionGroupe?.mentionEn || '' }
  })

  const notees = lignes.filter(l => l.note !== null)
  const coefTotal = notees.reduce((s, l) => s + l.coefficient, 0)
  const nxcTotal = Number(notees.reduce((s, l) => s + l.nxc, 0).toFixed(2))
  const moyenneGenerale = coefTotal > 0 ? Number((nxcTotal / coefTotal).toFixed(2)) : 0

  const moyennePonderee = (champ) => {
    const avecValeur = lignes.filter(l => l[champ] !== null && l[champ] !== undefined)
    const coef = avecValeur.reduce((s, l) => s + l.coefficient, 0)
    return coef > 0 ? Number((avecValeur.reduce((s, l) => s + l[champ] * l.coefficient, 0) / coef).toFixed(2)) : null
  }

  return {
    groupes,
    lignes,
    coefTotal,
    nxcTotal,
    moyenneGenerale,
    moyenneEval1: moyennePonderee('eval1'),
    moyenneEval2: moyennePonderee('eval2'),
    programmeDefini: programme.length > 0,
    matieresNotees: notees.length,
    matieresTotal: lignes.length
  }
}

// Absences (justifiées/non justifiées) et retards d'un élève sur la période du trimestre, d'après
// l'appel (Presence). Vide si l'appel n'a jamais été fait pour cette classe sur la période.
export async function disciplineEleve(prisma, eleveId, trimestre, anneeScolaire) {
  const { debut, fin } = plageTrimestre(anneeScolaire, parseInt(trimestre))
  const presences = await prisma.presence.findMany({ where: { eleveId, date: { gte: debut, lte: fin } } })
  return {
    absencesJustifiees: presences.filter(p => p.statut === 'JUSTIFIE').length,
    absencesNonJustifiees: presences.filter(p => p.statut === 'ABSENT').length,
    retards: presences.filter(p => p.statut === 'RETARD').length,
    appelFait: presences.length > 0
  }
}

// Statistiques de la classe pour ce trimestre : rang de l'élève, effectif, nombre d'élèves au-dessus
// / en-dessous de la moyenne, plus forte et plus faible moyenne.
export async function statistiquesClasse(prisma, classe, trimestre, anneeScolaire, bareme) {
  const eleves = await prisma.eleve.findMany({ where: { classeId: classe.id } })
  const moyennes = await Promise.all(eleves.map(async (e) => ({
    eleveId: e.id,
    moyenne: (await resultatsEleve(prisma, classe, e.id, trimestre, anneeScolaire, bareme)).moyenneGenerale
  })))
  const classement = [...moyennes].sort((a, b) => b.moyenne - a.moyenne)
  const valeurs = moyennes.map(m => m.moyenne)
  return {
    effectif: eleves.length,
    classement,
    nbAuDessus: valeurs.filter(v => v >= 10).length,
    nbEnDessous: valeurs.filter(v => v < 10).length,
    plusForteMoyenne: valeurs.length ? Math.max(...valeurs) : null,
    plusFaibleMoyenne: valeurs.length ? Math.min(...valeurs) : null
  }
}

const ordinal = (rang) => (rang === 1 ? '1er' : `${rang}è`)

// Assemble toutes les données d'un bulletin (élève déjà chargé avec classe.ecole) pour l'affichage /
// l'impression. `bulletin` (le mémo discipline/conseil déjà saisi, peut être null si pas encore créé).
export async function construireBulletin(prisma, eleve, trimestre, anneeScolaire, bulletin) {
  const classe = eleve.classe
  const ecole = classe.ecole
  const bareme = await baremeEcole(prisma, ecole.id)

  const [resultats, discipline, stats, chefEtablissement, professeurPrincipal] = await Promise.all([
    resultatsEleve(prisma, classe, eleve.id, trimestre, anneeScolaire, bareme),
    disciplineEleve(prisma, eleve.id, trimestre, anneeScolaire),
    statistiquesClasse(prisma, classe, trimestre, anneeScolaire, bareme),
    prisma.utilisateurEcole.findFirst({ where: { ecoleId: ecole.id, actif: true, role: { in: ['PRINCIPAL', 'DIRECTRICE'] } }, include: { utilisateur: { select: { nom: true } } } }),
    classe.professeurPrincipalId
      ? prisma.enseignant.findUnique({ where: { id: classe.professeurPrincipalId }, include: { utilisateur: { select: { nom: true } } } })
      : null
  ])

  const mentionGenerale = mentionPourNote(bareme.lignes, resultats.moyenneGenerale)

  return {
    eleve: {
      nom: eleve.nom, prenom: eleve.prenom, matricule: eleve.matricule, sexe: eleve.sexe,
      dateNaissance: eleve.dateNaissance, lieuNaissance: eleve.lieuNaissance || null,
      classe: classe.nom, niveau: classe.niveau, redouble: eleve.redouble
    },
    ecole: {
      nomCourt: ecole.nomCourt, nomComplet: ecole.nomComplet, niveau: ecole.niveau,
      adresse: ecole.adresse, telephone: ecole.telephone, email: ecole.email,
      delegationRegionale: ecole.delegationRegionale, delegationDepartementale: ecole.delegationDepartementale
    },
    effectif: stats.effectif,
    rang: stats.classement.findIndex(c => c.eleveId === eleve.id) + 1,
    groupes: resultats.groupes,
    coefTotal: resultats.coefTotal,
    nxcTotal: resultats.nxcTotal,
    moyenneGenerale: resultats.moyenneGenerale,
    mentionGenerale: mentionGenerale?.mentionFr || '',
    mentionGeneraleEn: mentionGenerale?.mentionEn || '',
    apcGenerale: mentionGenerale?.apc || '',
    bareme: bareme.lignes,
    moyenneEval1: resultats.moyenneEval1,
    moyenneEval2: resultats.moyenneEval2,
    programmeDefini: resultats.programmeDefini,
    matieresNotees: resultats.matieresNotees,
    matieresTotal: resultats.matieresTotal,
    classe: {
      nbAuDessus: stats.nbAuDessus, nbEnDessous: stats.nbEnDessous,
      plusForteMoyenne: stats.plusForteMoyenne, plusFaibleMoyenne: stats.plusFaibleMoyenne,
      moyenneGenerale: stats.classement.length ? Number((stats.classement.reduce((s, c) => s + c.moyenne, 0) / stats.classement.length).toFixed(2)) : 0
    },
    discipline,
    professeurPrincipal: professeurPrincipal?.utilisateur?.nom || null,
    chefEtablissement: chefEtablissement?.utilisateur?.nom || null,
    bulletin: bulletin ? {
      exclusionDefinitive: bulletin.exclusionDefinitive, joursExclusion: bulletin.joursExclusion,
      absenteisme: bulletin.absenteisme, conduiteDeplorable: bulletin.conduiteDeplorable, convocation: bulletin.convocation,
      tableauHonneur: bulletin.tableauHonneur, encouragement: bulletin.encouragement, felicitations: bulletin.felicitations,
      avertissementTravail: bulletin.avertissementTravail, blameTravail: bulletin.blameTravail,
      avertissementConduite: bulletin.avertissementConduite, blameConduite: bulletin.blameConduite,
      observationConseil: bulletin.observationConseil
    } : null,
    trimestre: parseInt(trimestre),
    anneeScolaire,
    rangLabel: ordinal(stats.classement.findIndex(c => c.eleveId === eleve.id) + 1)
  }
}
