import { mentionPourNote } from './baremeNotation'

const echapper = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const formatNote = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

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

const STYLE = `
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; }
  h1 { font-size: 15px; margin: 0 0 2px; }
  .entete { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .entete p { margin: 1px 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #444; padding: 3px 5px; }
  th { background: #e5e7eb; }
  td.nombre, th.nombre { text-align: center; }
  td.note { height: 20px; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .saut { page-break-after: always; }
  .rouge { color: #b91c1c; }
  .signature { margin-top: 14px; display: flex; justify-content: space-between; }
`

export function ouvrirImpression(titre, corps) {
  const fenetre = window.open('', '_blank')
  if (!fenetre) {
    alert("Le navigateur a bloqué la fenêtre d'impression : autorisez les fenêtres pop-up pour ce site.")
    return
  }
  fenetre.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${echapper(titre)}</title><style>${STYLE}</style></head><body>${corps}</body></html>`)
  fenetre.document.close()
  fenetre.focus()
  setTimeout(() => fenetre.print(), 300)
}

const enteteDocument = (titre, { classe, anneeScolaire, trimestre, evaluation }, extra = '') => `
  <div class="entete">
    <div>
      <h1>${echapper(titre)}</h1>
      <p><strong>${echapper(classe.ecole)}</strong> — Classe : <strong>${echapper(classe.nom)}</strong></p>
      <p>Année scolaire : ${echapper(anneeScolaire)} — ${echapper(libelleEvaluation(trimestre, evaluation))}</p>
    </div>
    <div>${extra}</div>
  </div>`

// Bordereau de toute la classe : élèves en lignes, matières en colonnes, avec ou sans les notes saisies
export function htmlBordereau(donnees, { avecNotes, notesSaisies = null }) {
  const { matieres, eleves, bareme } = donnees
  const notesDe = (eleve) => notesSaisies?.[eleve.id] ?? eleve.notes
  const colonnes = matieres.map(m => `<th class="nombre">${echapper(m.abreviation)}<br><small>coef ${m.coefficient}</small></th>`).join('')

  const lignes = eleves.map((eleve, i) => {
    const notes = notesDe(eleve)
    const cellules = matieres.map(m => {
      const v = avecNotes ? notes[m.matiereId] : null
      const rouge = v !== null && v !== undefined && v !== '' && Number(v) < 10
      return `<td class="nombre note ${rouge ? 'rouge' : ''}">${avecNotes ? formatNote(v === '' ? null : v) : ''}</td>`
    }).join('')
    const moyenne = avecNotes ? moyenneEleve(notes, matieres) : null
    const mention = moyenne !== null ? mentionPourNote(bareme.lignes, moyenne)?.mentionFr || '' : ''
    return `<tr><td class="nombre">${i + 1}</td><td>${echapper(eleve.nom)} ${echapper(eleve.prenom)}</td>${cellules}<td class="nombre">${moyenne !== null ? formatNote(moyenne) : ''}</td><td>${echapper(mention)}</td></tr>`
  }).join('')

  return `${enteteDocument('BORDEREAU DES NOTES', donnees, `<p>Notes sur 20 — Effectif : ${eleves.length}</p>`)}
    <table>
      <thead><tr><th class="nombre">N°</th><th>Noms et prénoms</th>${colonnes}<th class="nombre">Moy.</th><th>Mention</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>`
}

// Fiche de notes d'une matière, à remettre à l'enseignant pour la saisie manuscrite
export function htmlFicheMatiere(donnees, matiere, { professeur, avecMatricule }) {
  const lignes = donnees.eleves.map((eleve, i) => `
    <tr>
      <td class="nombre">${i + 1}</td>
      ${avecMatricule ? `<td>${echapper(eleve.matricule)}</td>` : ''}
      <td>${echapper(eleve.nom)} ${echapper(eleve.prenom)}</td>
      <td class="note" style="width:90px"></td>
      <td class="note" style="width:220px"></td>
    </tr>`).join('')

  const extra = `<p>Matière : <strong>${echapper(matiere.nom)}</strong> (coef ${matiere.coefficient})</p>
    <p>Professeur : <strong>${echapper(professeur || '................................')}</strong></p>
    <p>Notes sur 20 — Effectif : ${donnees.eleves.length}</p>`

  return `${enteteDocument('FICHE DE NOTES', donnees, extra)}
    <table>
      <thead><tr><th class="nombre">N°</th>${avecMatricule ? '<th>Matricule</th>' : ''}<th>Noms et prénoms</th><th class="nombre">Note /20</th><th>Observations</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>
    <div class="signature"><span>Date de remise : ....../....../..........</span><span>Signature de l'enseignant : ..............................</span></div>`
}

export const PAGE_SUIVANTE = '<div class="saut"></div>'

// Export Excel du bordereau (notes saisies à l'écran comprises)
export async function telechargerExcelBordereau(donnees, notesSaisies) {
  const { default: ExcelJS } = await import('exceljs')
  const { matieres, eleves, bareme, classe, anneeScolaire, trimestre, evaluation } = donnees
  const classeur = new ExcelJS.Workbook()
  const feuille = classeur.addWorksheet('Bordereau')

  feuille.addRow([`BORDEREAU DES NOTES — ${classe.ecole} — ${classe.nom} — ${anneeScolaire} — ${libelleEvaluation(trimestre, evaluation)}`])
  feuille.getRow(1).font = { bold: true }
  feuille.addRow(['N°', 'Noms et prénoms', ...matieres.map(m => m.abreviation), 'Moyenne', 'Mention'])
  feuille.addRow(['', 'Coefficient', ...matieres.map(m => m.coefficient), '', ''])
  feuille.getRow(2).font = { bold: true }

  eleves.forEach((eleve, i) => {
    const notes = notesSaisies?.[eleve.id] ?? eleve.notes
    const moyenne = moyenneEleve(notes, matieres)
    feuille.addRow([
      i + 1,
      `${eleve.nom} ${eleve.prenom}`,
      ...matieres.map(m => (notes[m.matiereId] === undefined || notes[m.matiereId] === '' || notes[m.matiereId] === null ? null : Number(notes[m.matiereId]))),
      moyenne !== null ? Number(moyenne.toFixed(2)) : null,
      moyenne !== null ? mentionPourNote(bareme.lignes, moyenne)?.mentionFr || '' : ''
    ])
  })
  feuille.getColumn(1).width = 5
  feuille.getColumn(2).width = 38
  for (let c = 3; c <= matieres.length + 4; c++) feuille.getColumn(c).width = 10
  feuille.getColumn(matieres.length + 4).width = 16

  const tampon = await classeur.xlsx.writeBuffer()
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  lien.download = `bordereau-${classe.nom}-T${trimestre}-E${evaluation}.xlsx`.replace(/\s+/g, '-')
  lien.click()
  URL.revokeObjectURL(lien.href)
}
