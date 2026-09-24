import { mentionPourNote } from './baremeNotation'

export const libelleEvaluation = (trimestre, evaluation) => `Trimestre ${trimestre} — Évaluation ${evaluation}`

// Moyenne d'un élève : pondérée par les coefficients de la classe ; si aucun coefficient n'est
// défini (tous à 0), moyenne simple des notes saisies.
export function moyenneEleve(notes, matieres) {
  const saisies = matieres.filter(m => notes[m.matiereId] !== undefined && notes[m.matiereId] !== null && notes[m.matiereId] !== '')
  if (saisies.length === 0) return null
  const coefficientsDefinis = matieres.some(m => m.coefficient > 0)
  if (!coefficientsDefinis) return saisies.reduce((s, m) => s + Number(notes[m.matiereId]), 0) / saisies.length
  const total = saisies.reduce((s, m) => s + m.coefficient, 0)
  if (total === 0) return null
  return saisies.reduce((s, m) => s + Number(notes[m.matiereId]) * m.coefficient, 0) / total
}

const enteteClasse = ({ classe, anneeScolaire, trimestre, evaluation }) => [
  `${classe.ecole} — Classe : ${classe.nom}`,
  `Année scolaire : ${anneeScolaire} — ${libelleEvaluation(trimestre, evaluation)}`
]

// Section (voir utils/exportTableau.js) du bordereau de toute la classe :
// élèves en lignes, matières en colonnes, avec ou sans les notes saisies.
export function sectionBordereau(donnees, { avecNotes, notesSaisies }) {
  const { matieres, eleves, bareme, classe } = donnees
  return {
    titre: 'BORDEREAU DES NOTES',
    nomFeuille: `Bordereau ${classe.nom}`,
    paysage: true,
    entete: [...enteteClasse(donnees), `Notes sur 20 — Effectif : ${eleves.length}`],
    colonnes: [
      { titre: 'N°', centre: true, largeur: 10 },
      { titre: 'Noms et prénoms' },
      ...matieres.map(m => ({ titre: `${m.abreviation}\ncoef ${m.coefficient}`, centre: true, type: 'note' })),
      { titre: 'Moy.', centre: true, type: 'note' },
      { titre: 'Mention' }
    ],
    lignes: eleves.map((eleve, i) => {
      const notes = notesSaisies?.[eleve.id] ?? eleve.notes
      const moyenne = avecNotes ? moyenneEleve(notes, matieres) : null
      return [
        i + 1,
        `${eleve.nom} ${eleve.prenom}`,
        ...matieres.map(m => (avecNotes && notes[m.matiereId] !== undefined && notes[m.matiereId] !== '' ? Number(notes[m.matiereId]) : null)),
        moyenne !== null ? Math.round(moyenne * 100) / 100 : null,
        moyenne !== null ? mentionPourNote(bareme.lignes, moyenne)?.mentionFr || '' : ''
      ]
    })
  }
}

// Section d'une fiche de notes d'une matière, à remettre à l'enseignant pour la saisie manuscrite
export function sectionFiche(donnees, matiere, { professeur, avecMatricule }) {
  const { eleves } = donnees
  return {
    titre: `FICHE DE NOTES — ${matiere.nom}`,
    nomFeuille: `Fiche ${matiere.abreviation}`,
    paysage: false,
    entete: [
      ...enteteClasse(donnees),
      `Matière : ${matiere.nom} (coef ${matiere.coefficient}) — Professeur : ${professeur || '................................'}`,
      `Notes sur 20 — Effectif : ${eleves.length}`
    ],
    colonnes: [
      { titre: 'N°', centre: true, largeur: 10 },
      ...(avecMatricule ? [{ titre: 'Matricule', largeur: 28 }] : []),
      { titre: 'Noms et prénoms' },
      { titre: 'Note /20', centre: true, largeur: 24 },
      { titre: 'Observations', largeur: 55 }
    ],
    lignes: eleves.map((eleve, i) => [
      i + 1,
      ...(avecMatricule ? [eleve.matricule] : []),
      `${eleve.nom} ${eleve.prenom}`,
      '',
      ''
    ]),
    pied: ["Date de remise : ....../....../..........        Signature de l'enseignant : .............................."]
  }
}
