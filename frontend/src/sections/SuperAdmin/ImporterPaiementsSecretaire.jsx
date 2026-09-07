import { useState } from 'react'
import { Loader, Download, Upload, CheckCircle2, XCircle } from 'lucide-react'
import { apiClient } from '../../api/client'

const COLONNES = [
  { titre: 'Matricule', cle: 'matricule' },
  { titre: 'Nom', cle: 'nom' },
  { titre: 'Prénom', cle: 'prenom' },
  { titre: 'Classe', cle: 'classe' },
  { titre: 'Inscription', cle: 'inscription' },
  { titre: 'Tranche 1', cle: 'tranche1' },
  { titre: 'Tranche 2', cle: 'tranche2' },
  { titre: 'Tranche 3', cle: 'tranche3' }
]

const EXEMPLE = ['MAT001', 'Nkomo', 'Jean', '6ème A', '15000', '50000', '', '']

export default function ImporterPaiementsSecretaire({ onImportTermine }) {
  const [fichier, setFichier] = useState(null)
  const [lignes, setLignes] = useState([])
  const [importing, setImporting] = useState(false)
  const [erreurLecture, setErreurLecture] = useState('')
  const [resultat, setResultat] = useState(null)

  const telechargerModele = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const feuille = workbook.addWorksheet('Paiements')
    feuille.addRow(COLONNES.map(c => c.titre))
    feuille.addRow(EXEMPLE)
    feuille.getRow(1).font = { bold: true }
    feuille.columns.forEach(col => { col.width = 16 })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-paiements.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFichier = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFichier(file)
    setErreurLecture('')
    setResultat(null)
    setLignes([])

    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const feuille = workbook.worksheets[0]

      const entetes = feuille.getRow(1).values.slice(1).map(v => String(v || '').trim())
      const indexParCle = {}
      COLONNES.forEach(c => {
        const idx = entetes.findIndex(e => e === c.titre)
        if (idx !== -1) indexParCle[c.cle] = idx
      })

      const lignesLues = []
      feuille.eachRow((row, numeroLigne) => {
        if (numeroLigne === 1) return
        const valeurs = row.values.slice(1)
        if (valeurs.every(v => v === null || v === undefined || v === '')) return

        const ligne = {}
        COLONNES.forEach(c => {
          const idx = indexParCle[c.cle]
          const val = idx !== undefined ? valeurs[idx] : ''
          ligne[c.cle] = val !== null && val !== undefined ? String(val).trim() : ''
        })
        lignesLues.push(ligne)
      })

      if (lignesLues.length === 0) {
        setErreurLecture("Aucune ligne de paiement trouvée dans ce fichier.")
      }
      setLignes(lignesLues)
    } catch (err) {
      setErreurLecture('Impossible de lire ce fichier : ' + err.message)
    }
  }

  const lancerImport = async () => {
    setImporting(true)
    setResultat(null)
    try {
      const res = await apiClient.importerPaiements(lignes)
      setResultat(res)
      onImportTermine?.()
    } catch (err) {
      setErreurLecture(err.message || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <p className="text-sm text-slate-500">
        Format : Matricule (ou Nom + Prénom + Classe), puis un montant par poste (Inscription, Tranche 1, 2, 3).
        Les frais annexes se saisissent via le formulaire.
      </p>

      <button
        onClick={telechargerModele}
        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-2"
      >
        <Download className="w-4 h-4" /> Télécharger le modèle Excel
      </button>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fichier rempli (.xlsx)</label>
        <input type="file" accept=".xlsx" onChange={handleFichier} className="block" />
      </div>

      {erreurLecture && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {erreurLecture}</div>}

      {fichier && lignes.length > 0 && !resultat && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{lignes.length} paiement(s) détecté(s) dans le fichier « {fichier.name} ».</p>
          <button
            onClick={lancerImport}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? <><Loader className="w-4 h-4 animate-spin" /> Import en cours...</> : <><Upload className="w-4 h-4" /> Importer {lignes.length} paiement(s)</>}
          </button>
        </div>
      )}

      {resultat && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="text-green-700 font-medium">{resultat.reussis} réussi(s)</span>
            {resultat.echoues > 0 && <span className="text-red-700 font-medium">{resultat.echoues} échoué(s)</span>}
          </div>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {resultat.resultats.map(r => (
              <div key={r.ligne} className="flex items-start gap-2 px-3 py-2 text-sm">
                {r.succes
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                <span><strong>Ligne {r.ligne} :</strong> {r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
