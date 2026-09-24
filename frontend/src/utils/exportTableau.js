// Export d'un ou plusieurs tableaux en impression, PDF ou Excel à partir d'une même description.
//
// Une "section" décrit un tableau :
//   { titre, entete: ['ligne', ...], colonnes: [{ titre, centre?, type?: 'note', largeur? }],
//     lignes: [[cellule, ...]], pied?: ['ligne', ...], nomFeuille?, paysage? }
// Plusieurs sections = une page (PDF/impression) ou une feuille (Excel) chacune.
// Une colonne de type 'note' est affichée avec 2 décimales, en rouge sous 10.

const echapper = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const estNote = (colonne, cellule) => colonne.type === 'note' && typeof cellule === 'number'
const formatCellule = (colonne, cellule) => {
  if (cellule === null || cellule === undefined) return ''
  if (estNote(colonne, cellule)) return cellule.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return String(cellule)
}
const estRouge = (colonne, cellule) => estNote(colonne, cellule) && cellule < 10

const STYLE = (paysage) => `
  @page { size: A4 ${paysage ? 'landscape' : 'portrait'}; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; }
  h1 { font-size: 15px; margin: 0 0 2px; }
  p { margin: 1px 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #444; padding: 3px 5px; }
  th { background: #e5e7eb; }
  .centre { text-align: center; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .section { page-break-after: always; }
  .section:last-child { page-break-after: auto; }
  .rouge { color: #b91c1c; }
  .pied { margin-top: 14px; }
`

export function imprimerSections(sections) {
  const fenetre = window.open('', '_blank')
  if (!fenetre) {
    alert("Le navigateur a bloqué la fenêtre d'impression : autorisez les fenêtres pop-up pour ce site.")
    return
  }
  const corps = sections.map(s => `
    <div class="section">
      <h1>${echapper(s.titre)}</h1>
      ${(s.entete || []).map(l => `<p>${echapper(l)}</p>`).join('')}
      <table>
        <thead><tr>${s.colonnes.map(c => `<th class="${c.centre ? 'centre' : ''}">${echapper(c.titre).replace(/\n/g, '<br>')}</th>`).join('')}</tr></thead>
        <tbody>${s.lignes.map(ligne => `<tr>${ligne.map((cellule, i) => {
          const c = s.colonnes[i]
          return `<td class="${c.centre ? 'centre' : ''} ${estRouge(c, cellule) ? 'rouge' : ''}" style="height:18px">${echapper(formatCellule(c, cellule))}</td>`
        }).join('')}</tr>`).join('')}</tbody>
      </table>
      ${(s.pied || []).map(l => `<p class="pied">${echapper(l)}</p>`).join('')}
    </div>`).join('')

  fenetre.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${echapper(sections[0]?.titre || 'Impression')}</title><style>${STYLE(sections[0]?.paysage)}</style></head><body>${corps}</body></html>`)
  fenetre.document.close()
  fenetre.focus()
  setTimeout(() => fenetre.print(), 300)
}

export async function telechargerPdf(sections, nomFichier) {
  const [moduleJspdf, moduleAutoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const JsPdf = moduleJspdf.jsPDF || moduleJspdf.default
  const autoTable = moduleAutoTable.autoTable || moduleAutoTable.default
  const doc = new JsPdf({ orientation: sections[0]?.paysage ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })

  sections.forEach((s, index) => {
    if (index > 0) doc.addPage()
    let y = 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(s.titre, 10, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    ;(s.entete || []).forEach(ligne => { y += 5; doc.text(ligne, 10, y) })

    autoTable(doc, {
      startY: y + 4,
      head: [s.colonnes.map(c => c.titre)],
      body: s.lignes.map(ligne => ligne.map((cellule, i) => formatCellule(s.colonnes[i], cellule))),
      theme: 'grid',
      margin: { left: 10, right: 10, bottom: 12 },
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [68, 68, 68], lineWidth: 0.1, textColor: [17, 17, 17], minCellHeight: 6 },
      headStyles: { fillColor: [229, 231, 235], textColor: [17, 17, 17], fontStyle: 'bold' },
      columnStyles: Object.fromEntries(s.colonnes.map((c, i) => [i, { halign: c.centre ? 'center' : 'left', ...(c.largeur ? { cellWidth: c.largeur } : {}) }])),
      didParseCell: (data) => {
        if (data.section === 'body') {
          const cellule = s.lignes[data.row.index][data.column.index]
          if (estRouge(s.colonnes[data.column.index], cellule)) data.cell.styles.textColor = [185, 28, 28]
        }
      }
    })

    let yFin = doc.lastAutoTable.finalY + 8
    ;(s.pied || []).forEach(ligne => { doc.text(ligne, 10, yFin); yFin += 6 })
  })

  const pages = doc.getNumberOfPages()
  doc.setFontSize(8)
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    const { width, height } = doc.internal.pageSize
    doc.text(`Page ${p} / ${pages}`, width - 10, height - 5, { align: 'right' })
  }
  doc.save(nomFichier.endsWith('.pdf') ? nomFichier : `${nomFichier}.pdf`)
}

export async function telechargerExcel(sections, nomFichier) {
  const { default: ExcelJS } = await import('exceljs')
  const classeur = new ExcelJS.Workbook()
  const nomsPris = new Set()

  sections.forEach((s, index) => {
    let nom = (s.nomFeuille || s.titre || `Feuille ${index + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || `Feuille ${index + 1}`
    for (let n = 2; nomsPris.has(nom.toLowerCase()); n++) nom = `${nom.slice(0, 28)} ${n}`
    nomsPris.add(nom.toLowerCase())
    const feuille = classeur.addWorksheet(nom)

    feuille.addRow([s.titre]).font = { bold: true, size: 13 }
    ;(s.entete || []).forEach(l => feuille.addRow([l]))
    feuille.addRow([])
    const ligneEntete = feuille.addRow(s.colonnes.map(c => c.titre))
    ligneEntete.font = { bold: true }
    ligneEntete.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
    ligneEntete.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } } })

    s.lignes.forEach(ligne => {
      const l = feuille.addRow(ligne.map(c => (c === undefined ? null : c)))
      l.eachCell({ includeEmpty: true }, (cell, i) => {
        const colonne = s.colonnes[i - 1]
        if (colonne?.type === 'note') cell.numFmt = '0.00'
        if (colonne?.centre) cell.alignment = { horizontal: 'center' }
      })
    })
    ;(s.pied || []).forEach((l, i) => feuille.addRow(i === 0 ? ['', l] : [l]))

    s.colonnes.forEach((c, i) => {
      const longueurMax = Math.max(String(c.titre).split('\n').reduce((m, t) => Math.max(m, t.length), 0), ...s.lignes.map(l => String(formatCellule(c, l[i])).length))
      feuille.getColumn(i + 1).width = Math.min(Math.max(longueurMax + 2, 6), 45)
    })
  })

  const tampon = await classeur.xlsx.writeBuffer()
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  lien.download = nomFichier.endsWith('.xlsx') ? nomFichier : `${nomFichier}.xlsx`
  lien.click()
  URL.revokeObjectURL(lien.href)
}

export const nomFichierSur = (texte) => String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
