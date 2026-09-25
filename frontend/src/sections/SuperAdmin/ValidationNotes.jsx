import { useState, useEffect, useMemo } from 'react'
import { Loader, Check, X, ShieldCheck } from 'lucide-react'
import { apiClient } from '../../api/client'

const estValide = (statut) => statut === 'VALIDE' || statut === 'VALIDÉ'
const BADGES = {
  BROUILLON: { label: 'À valider', className: 'bg-amber-100 text-amber-800' },
  VALIDE: { label: '✓ Validée', className: 'bg-green-100 text-green-800' },
  REJETE: { label: '✗ Rejetée', className: 'bg-red-100 text-red-800' }
}
const formatNote = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ValidationNotes() {
  const [notes, setNotes] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [trimestre, setTrimestre] = useState('')
  const [statut, setStatut] = useState('BROUILLON')
  const [loading, setLoading] = useState(true)
  const [enCours, setEnCours] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const charger = async () => {
    setError('')
    try {
      setNotes(await apiClient.getNotes())
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des notes')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { charger() }, [])

  const statutNormalise = (n) => (estValide(n.statutValidation) ? 'VALIDE' : n.statutValidation)

  const ecoles = useMemo(() => {
    const m = new Map()
    notes.forEach(n => { const e = n.eleve?.classe?.ecole; if (e) m.set(e.id, e.nomCourt) })
    return [...m.entries()].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [notes])

  const classes = useMemo(() => {
    const m = new Map()
    notes.filter(n => !ecoleId || n.eleve?.classe?.ecoleId === ecoleId).forEach(n => { const c = n.eleve?.classe; if (c) m.set(c.id, c.nom) })
    return [...m.entries()].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [notes, ecoleId])

  const affichees = useMemo(() => notes.filter(n => {
    if (ecoleId && n.eleve?.classe?.ecoleId !== ecoleId) return false
    if (classeId && n.eleve?.classeId !== classeId) return false
    if (trimestre && n.trimestre !== parseInt(trimestre)) return false
    if (statut && statutNormalise(n) !== statut) return false
    return true
  }), [notes, ecoleId, classeId, trimestre, statut])

  const compte = (s) => notes.filter(n => statutNormalise(n) === s).length

  const agir = async (cle, action, succes) => {
    setEnCours(cle)
    setError('')
    setMessage('')
    try {
      await action()
      await charger()
      setMessage(succes)
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setEnCours('')
    }
  }

  const validerTout = () => {
    const ids = affichees.filter(n => statutNormalise(n) !== 'VALIDE').map(n => n.id)
    if (ids.length === 0) return
    if (!confirm(`Valider ${ids.length} note(s) affichée(s) ?`)) return
    agir('lot', () => apiClient.validerNotesLot(ids), `${ids.length} note(s) validée(s).`)
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  const selecteur = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-green-600" /> Validation des notes des enseignants</h2>
      <p className="text-sm text-slate-500 -mt-4">
        Notes envoyées par les enseignants : contrôlez-les puis validez-les. Seules les notes validées sont utilisées dans les bulletins.
      </p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">À valider : <strong>{compte('BROUILLON')}</strong></span>
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">Validées : <strong>{compte('VALIDE')}</strong></span>
        <span className="px-3 py-1 rounded-full bg-red-100 text-red-800">Rejetées : <strong>{compte('REJETE')}</strong></span>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">École</label>
          <select value={ecoleId} onChange={(e) => { setEcoleId(e.target.value); setClasseId('') }} className={selecteur}>
            <option value="">Toutes</option>
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
          <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className={selecteur}>
            <option value="">Toutes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Trimestre</label>
          <select value={trimestre} onChange={(e) => setTrimestre(e.target.value)} className={selecteur}>
            <option value="">Tous</option>
            {[1, 2, 3].map(t => <option key={t} value={t}>Trimestre {t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selecteur}>
            <option value="BROUILLON">À valider</option>
            <option value="VALIDE">Validées</option>
            <option value="REJETE">Rejetées</option>
            <option value="">Toutes</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900">{affichees.length} note(s)</h3>
          <button
            onClick={validerTout}
            disabled={!!enCours || !affichees.some(n => statutNormalise(n) !== 'VALIDE')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {enCours === 'lot' ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Valider toutes les notes affichées
          </button>
        </div>

        {affichees.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucune note pour cette sélection</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Élève</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Classe</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Matière</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Enseignant</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Trim.</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Note /20</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Statut</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affichees.map(n => {
                  const st = statutNormalise(n)
                  const badge = BADGES[st] || BADGES.BROUILLON
                  return (
                    <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900">{n.eleve?.nom} {n.eleve?.prenom}</td>
                      <td className="px-4 py-2 text-slate-600">{n.eleve?.classe?.nom}</td>
                      <td className="px-4 py-2 text-slate-600">{n.enseignantClasseMatiere?.matiere?.nom}</td>
                      <td className="px-4 py-2 text-slate-600">{n.enseignantClasseMatiere?.enseignant?.utilisateur?.nom}</td>
                      <td className="px-4 py-2 text-center">{n.trimestre}</td>
                      <td className={`px-4 py-2 text-center font-mono font-semibold ${n.valeur < 10 ? 'text-red-600' : 'text-slate-900'}`}>{formatNote(n.valeur)}</td>
                      <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded text-xs font-medium ${badge.className}`}>{badge.label}</span></td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        {st !== 'VALIDE' && (
                          <button onClick={() => agir(n.id, () => apiClient.validerNote(n.id), 'Note validée.')} disabled={!!enCours} className="p-2 text-green-700 hover:bg-green-50 rounded" title="Valider"><Check className="w-4 h-4" /></button>
                        )}
                        {st !== 'REJETE' && (
                          <button onClick={() => agir(n.id, () => apiClient.rejeterNote(n.id), 'Note rejetée : l\'enseignant doit la corriger.')} disabled={!!enCours} className="p-2 text-red-700 hover:bg-red-50 rounded" title="Rejeter"><X className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
