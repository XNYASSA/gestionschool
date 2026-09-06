import { useState, useEffect } from 'react'
import { Loader, Download, Upload, CheckCircle2, XCircle } from 'lucide-react'
import { apiClient } from '../../api/client'

const COLONNES = [
  { titre: 'Matricule (optionnel)', cle: 'matricule' },
  { titre: 'Nom*', cle: 'nom' },
  { titre: 'Prénom*', cle: 'prenom' },
  { titre: 'Sexe (M/F)*', cle: 'sexe' },
  { titre: 'Date de naissance (JJ/MM/AAAA)*', cle: 'dateNaissance' },
  { titre: 'Classe*', cle: 'classe' },
  { titre: 'Nom du parent/tuteur*', cle: 'nomParent' },
  { titre: 'Lien de parenté', cle: 'lieuParente' },
  { titre: 'Téléphone du parent*', cle: 'telephoneParent' },
  { titre: 'Email du parent', cle: 'emailParent' },
  { titre: 'Adresse du parent', cle: 'adresseParent' },
  { titre: 'Montant déjà versé (FCFA)', cle: 'montantDejaVerse' }
]

const EXEMPLE = ['', 'Nkomo', 'Jean', 'M', '15/03/2015', '6ème A', 'Marie Nkomo', 'Mère', '677123456', '', '', '50000']

function formatDate(valeur) {
  if (valeur instanceof Date) {
    const jj = String(valeur.getDate()).padStart(2, '0')
    const mm = String(valeur.getMonth() + 1).padStart(2, '0')
    return `${valeur.getFullYear()}-${mm}-${jj}`
  }
  const texte = String(valeur || '').trim()
  const match = texte.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, j, m, a] = match
    return `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`
  }
  return texte
}

export default function ImporterEleves() {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [fichier, setFichier] = useState(null)
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [erreurLecture, setErreurLecture] = useState('')
  const [resultat, setResultat] = useState(null)

  useEffect(() => {
    apiClient.getEcoles()
      .then(data => {
        setEcoles(data)
        if (data.length > 0) setEcoleId(data[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  const telechargerModele = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const feuille = workbook.addWorksheet('Élèves')
    feuille.addRow(COLONNES.map(c => c.titre))
    feuille.addRow(EXEMPLE)
    feuille.getRow(1).font = { bold: true }
    feuille.columns.forEach(col => { col.width = 24 })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-eleves.xlsx'
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
          let val = idx !== undefined ? valeurs[idx] : ''
          if (c.cle === 'dateNaissance') val = formatDate(val)
          ligne[c.cle] = val !== null && val !== undefined ? String(val).trim() : ''
        })
        lignesLues.push(ligne)
      })

      if (lignesLues.length === 0) {
        setErreurLecture("Aucune ligne d'élève trouvée dans ce fichier.")
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
      const res = await apiClient.importerEleves(ecoleId, lignes)
      setResultat(res)
    } catch (err) {
      setErreurLecture(err.message || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">📥 Importer des élèves</h2>
      <p className="text-sm text-slate-500 -mt-4">
        Remplissez le modèle Excel avec les élèves à inscrire, puis importez-le ici — plus rapide que le formulaire pour plusieurs élèves à la fois.
      </p>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
          <select
            value={ecoleId}
            onChange={(e) => setEcoleId(e.target.value)}
            className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg"
          >
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
        </div>

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
            <p className="text-sm text-slate-600">{lignes.length} élève(s) détecté(s) dans le fichier « {fichier.name} ».</p>
            <button
              onClick={lancerImport}
              disabled={importing || !ecoleId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? <><Loader className="w-4 h-4 animate-spin" /> Import en cours...</> : <><Upload className="w-4 h-4" /> Importer {lignes.length} élève(s)</>}
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
    </div>
  )
}
