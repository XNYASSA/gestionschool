import { useState } from 'react'
import { Download, Upload, Loader, CheckCircle2, XCircle, MinusCircle, X } from 'lucide-react'
import { apiClient } from '../../api/client'

const ENTETES_MODELE = ['Nom', 'Prénom', 'Rôle']
const EXEMPLES_MODELE = [['NKOMO', 'Jean', 'Enseignant'], ['MBALLA', 'Marie', 'Secrétaire']]

const normaliser = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

// Valeur d'une cellule Excel en texte (texte enrichi, formule ou nombre compris)
function texteCellule(valeur) {
  if (valeur === null || valeur === undefined) return ''
  if (typeof valeur === 'object') {
    if (valeur.richText) return valeur.richText.map(t => t.text).join('').trim()
    if (valeur.text) return String(valeur.text).trim()
    if (valeur.result !== undefined) return String(valeur.result).trim()
  }
  return String(valeur).trim()
}

export default function ImporterPersonnel({ ecoles, peutCreerAdmin, onFermer, onTermine }) {
  const [ecoleId, setEcoleId] = useState(ecoles[0]?.id || '')
  const [fichier, setFichier] = useState(null)
  const [lignes, setLignes] = useState([])
  const [importing, setImporting] = useState(false)
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState(null)

  const telechargerModele = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const feuille = workbook.addWorksheet('Personnel')
    feuille.addRow(ENTETES_MODELE)
    EXEMPLES_MODELE.forEach(l => feuille.addRow(l))
    feuille.getRow(1).font = { bold: true }
    feuille.columns.forEach(col => { col.width = 24 })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-personnel.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFichier = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFichier(file)
    setErreur('')
    setResultat(null)
    setLignes([])

    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const feuille = workbook.worksheets[0]

      // Colonnes repérées par leur titre, sans tenir compte des accents, de la casse ni des astérisques
      const entetes = feuille.getRow(1).values.slice(1).map(normaliser)
      const idxPrenom = entetes.findIndex(h => h.includes('prenom'))
      const idxNom = entetes.findIndex(h => h.includes('nom') && !h.includes('prenom'))
      const idxRole = entetes.findIndex(h => h.includes('role') || h.includes('poste') || h.includes('fonction'))

      if (idxNom === -1 && idxPrenom === -1) {
        setErreur('Colonnes introuvables : la première ligne du fichier doit contenir les titres « Nom », « Prénom » et « Rôle ».')
        return
      }

      const lues = []
      feuille.eachRow((row, numeroLigne) => {
        if (numeroLigne === 1) return
        const valeurs = row.values.slice(1)
        const ligne = {
          nom: idxNom !== -1 ? texteCellule(valeurs[idxNom]) : '',
          prenom: idxPrenom !== -1 ? texteCellule(valeurs[idxPrenom]) : '',
          role: idxRole !== -1 ? texteCellule(valeurs[idxRole]) : ''
        }
        if (!ligne.nom && !ligne.prenom && !ligne.role) return
        lues.push(ligne)
      })

      if (lues.length === 0) setErreur('Aucune ligne trouvée dans ce fichier.')
      setLignes(lues)
    } catch (err) {
      setErreur('Impossible de lire ce fichier : ' + err.message)
    }
  }

  const lancerImport = async () => {
    setImporting(true)
    setErreur('')
    try {
      const res = await apiClient.importerPersonnel(ecoleId, lignes)
      setResultat(res)
      if (res.crees > 0) onTermine()
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border border-blue-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">📥 Importer une liste du personnel</h3>
          <p className="text-sm text-slate-500 mt-1">
            Colonnes du fichier Excel : <strong>Nom</strong>, <strong>Prénom</strong>, <strong>Rôle</strong>
            {' '}({peutCreerAdmin ? 'Enseignant, Secrétaire, Économat, Surveillant Général, Principal, Directrice, Autre personnel' : 'Enseignant, Secrétaire, Économat, Surveillant Général, Autre personnel'}).
            Un rôle laissé vide est considéré comme « Enseignant ». Les personnes déjà présentes dans l'école sont ignorées, vous pouvez donc réimporter une liste complétée.
          </p>
        </div>
        <button onClick={onFermer} className="text-slate-500 hover:text-slate-700 shrink-0" title="Fermer"><X className="w-5 h-5" /></button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
        Les personnes importées sont enregistrées <strong>sans accès à l'application</strong> (ni email ni mot de passe) : elles peuvent être
        affectées à des classes et matières. Pour donner un accès à l'une d'elles, ouvrez sa fiche (crayon) et saisissez son email et son mot de passe.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">École de destination</label>
          <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={telechargerModele} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-2">
            <Download className="w-4 h-4" /> Télécharger le modèle Excel
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fichier rempli (.xlsx)</label>
        <input type="file" accept=".xlsx" onChange={handleFichier} className="block" />
      </div>

      {erreur && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">⚠️ {erreur}</div>}

      {fichier && lignes.length > 0 && !resultat && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{lignes.length} personne(s) détectée(s) dans « {fichier.name} » — école : <strong>{ecoles.find(e => e.id === ecoleId)?.nomCourt}</strong>.</p>
          <button
            onClick={lancerImport}
            disabled={importing || !ecoleId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? <><Loader className="w-4 h-4 animate-spin" /> Import en cours...</> : <><Upload className="w-4 h-4" /> Importer {lignes.length} personne(s)</>}
          </button>
        </div>
      )}

      {resultat && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-green-700 font-medium">{resultat.crees} ajouté(s)</span>
            {resultat.ignores > 0 && <span className="text-slate-600 font-medium">{resultat.ignores} déjà présent(s)</span>}
            {resultat.erreurs > 0 && <span className="text-red-700 font-medium">{resultat.erreurs} en erreur</span>}
          </div>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {resultat.resultats.map(r => (
              <div key={r.ligne} className="flex items-start gap-2 px-3 py-2 text-sm">
                {r.statut === 'cree' && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />}
                {r.statut === 'ignore' && <MinusCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
                {r.statut === 'erreur' && <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                <span><strong>N° {r.ligne} :</strong> {r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
