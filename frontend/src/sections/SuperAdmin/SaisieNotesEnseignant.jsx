import { useState, useEffect } from 'react'
import { Plus, Loader } from 'lucide-react'
import { apiClient } from '../../api/client'

const TRIMESTRES = [1, 2, 3]

export default function SaisieNotesEnseignant() {
  const [mesEcm, setMesEcm] = useState([])
  const [eleves, setEleves] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ecmId: '', eleveId: '', trimestre: 1, valeur: '', observation: '' })

  useEffect(() => {
    loadDonnees()
  }, [])

  const loadDonnees = async () => {
    setLoading(true)
    setError('')
    try {
      const [ecmData, elevesData, notesData] = await Promise.all([
        apiClient.getMesEcm(),
        apiClient.getEleves(),
        apiClient.getNotes()
      ])
      setMesEcm(ecmData)
      setEleves(elevesData)
      setNotes(notesData)
      if (ecmData.length > 0) setForm(f => ({ ...f, ecmId: ecmData[0].ecmId }))
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const ecmSelectionne = mesEcm.find(e => e.ecmId === form.ecmId)
  const elevesClasse = ecmSelectionne ? eleves.filter(e => e.classeId === ecmSelectionne.classeId) : []
  const notesEcm = notes.filter(n => n.ecmId === form.ecmId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.ecmId || !form.eleveId || !form.valeur) return

    setError('')
    setMessage('')
    try {
      await apiClient.createNote(form.eleveId, form.ecmId, form.trimestre, parseFloat(form.valeur), form.observation || null)
      setMessage('Note enregistrée avec succès.')
      setForm({ ...form, eleveId: '', valeur: '', observation: '' })
      await loadDonnees()
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement de la note")
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">📝 Saisie de notes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Saisir note
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      {mesEcm.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
          Aucune classe/matière ne vous est encore affectée.
        </div>
      ) : (
        <>
          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Enregistrer une note</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe / Matière</label>
                  <select
                    value={form.ecmId}
                    onChange={(e) => setForm({ ...form, ecmId: e.target.value, eleveId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {mesEcm.map(ecm => (
                      <option key={ecm.ecmId} value={ecm.ecmId}>
                        {ecm.classeNom} — {ecm.matiereNom} ({ecm.ecoleNom})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Élève</label>
                  <select
                    value={form.eleveId}
                    onChange={(e) => setForm({ ...form, eleveId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Sélectionner un élève</option>
                    {elevesClasse.map(eleve => (
                      <option key={eleve.id} value={eleve.id}>{eleve.prenom} {eleve.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trimestre</label>
                    <select
                      value={form.trimestre}
                      onChange={(e) => setForm({ ...form, trimestre: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {TRIMESTRES.map(t => <option key={t} value={t}>Trimestre {t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Note (0-20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={form.valeur}
                      onChange={(e) => setForm({ ...form, valeur: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: 15.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observation (facultatif)</label>
                  <textarea
                    value={form.observation}
                    onChange={(e) => setForm({ ...form, observation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows="2"
                    placeholder="Ex: Excellent travail !"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition">
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">
                Notes — {ecmSelectionne ? `${ecmSelectionne.classeNom} / ${ecmSelectionne.matiereNom}` : ''} ({notesEcm.length})
              </h3>
            </div>
            {notesEcm.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucune note saisie pour cette classe/matière</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Élève</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-700">Trimestre</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-700">Note</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-700">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notesEcm.map(note => (
                      <tr key={note.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-900">{note.eleve?.prenom} {note.eleve?.nom}</td>
                        <td className="px-4 py-2 text-center text-slate-600">{note.trimestre}</td>
                        <td className="px-4 py-2 text-center font-semibold text-slate-900">{note.valeur}/20</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${note.statutValidation === 'VALIDE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {note.statutValidation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
