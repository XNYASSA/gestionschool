import { useState } from 'react'
import { Printer, FileDown, FileSpreadsheet, Loader } from 'lucide-react'
import { imprimerSections, telechargerPdf, telechargerExcel } from '../utils/exportTableau'

// Boutons Imprimer / PDF / Excel. `construire` est appelée au clic et retourne
// { sections, nomFichier } (voir utils/exportTableau.js).
export default function BoutonsExport({ construire, disabled = false, excel = true }) {
  const [enCours, setEnCours] = useState('')

  const lancer = async (type) => {
    setEnCours(type)
    try {
      const { sections, nomFichier } = construire()
      if (type === 'imprimer') imprimerSections(sections)
      else if (type === 'pdf') await telechargerPdf(sections, nomFichier)
      else await telechargerExcel(sections, nomFichier)
    } catch (err) {
      alert("Erreur lors de l'export : " + (err.message || err))
    } finally {
      setEnCours('')
    }
  }

  const classe = 'px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium disabled:opacity-50'
  const icone = (type, Icone) => (enCours === type ? <Loader className="w-4 h-4 animate-spin" /> : <Icone className="w-4 h-4" />)

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => lancer('imprimer')} disabled={disabled || !!enCours} className={`${classe} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
        {icone('imprimer', Printer)} Imprimer
      </button>
      <button type="button" onClick={() => lancer('pdf')} disabled={disabled || !!enCours} className={`${classe} bg-red-600 text-white hover:bg-red-700`}>
        {icone('pdf', FileDown)} Télécharger PDF
      </button>
      {excel && (
        <button type="button" onClick={() => lancer('excel')} disabled={disabled || !!enCours} className={`${classe} bg-green-600 text-white hover:bg-green-700`}>
          {icone('excel', FileSpreadsheet)} Télécharger Excel
        </button>
      )}
    </div>
  )
}
