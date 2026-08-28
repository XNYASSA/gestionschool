import { useState, useEffect } from 'react'
import { Loader, Check, Calendar } from 'lucide-react'
import { apiClient } from '../../api/client'

const todayISO = () => new Date().toISOString().split('T')[0]

export default function AppelPresence() {
  const [mesEcm, setMesEcm] = useState([])
  const [classeId, setClasseId] = useState('')
  const [eleves, setEleves] = useState([])
  const [dateJour, setDateJour] = useState(todayISO())
  const [statuts, setStatuts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadDonnees()
  }, [])

  useEffect(() => {
    if (classeId) loadEleves()
  }, [classeId])

  const loadDonnees = async () => {
    setLoading(true)
    setError('')
    try {
      const ecmData = await apiClient.getMesEcm()
      setMesEcm(ecmData)
      if (ecmData.length > 0) setClasseId(ecmData[0].classeId)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement de vos affectations')
    } finally {
      setLoading(false)
    }
  }

  const loadEleves = async () => {
    try {
      const data = await apiClient.getEleves()
      const elevesClasse = data.filter(e => e.classeId === classeId)
      setEleves(elevesClasse)
      const initial = {}
      elevesClasse.forEach(e => { initial[e.id] = 'PRESENT' })
      setStatuts(initial)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des élèves')
    }
  }

  // Classes distinctes parmi ses affectations (une classe peut revenir pour plusieurs matières)
  const classesUniques = Array.from(new Map(mesEcm.map(e => [e.classeId, e])).values())

  const handleValiderAppel = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await Promise.all(
        eleves.map(eleve =>
          apiClient.enregistrerPresence(eleve.id, classeId, dateJour, statuts[eleve.id] || 'PRESENT')
        )
      )
      setMessage('Appel enregistré avec succès.')
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement de l'appel")
    } finally {
      setSaving(false)
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
          <h2 className="text-xl font-bold text-slate-900">✓ Appel - Présence des élèves</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="w-4 h-4" /> Date :
            </label>
            <input
              type="date"
              value={dateJour}
              max={todayISO()}
              onChange={(e) => setDateJour(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">⚠️ {error}</div>}
        {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 mb-4">✓ {message}</div>}

        {classesUniques.length === 0 ? (
          <p className="text-slate-500">Aucune classe/matière ne vous est encore affectée.</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
              <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg">
                {classesUniques.map(c => (
                  <option key={c.classeId} value={c.classeId}>{c.classeNom} ({c.ecoleNom})</option>
                ))}
              </select>
            </div>

            {eleves.length === 0 ? (
              <p className="text-slate-500">Aucun élève dans cette classe</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {eleves.map(eleve => (
                    <div key={eleve.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                      <span className="flex-1 text-slate-900">{eleve.prenom} {eleve.nom}</span>
                      <span className="text-xs text-slate-500">{eleve.matricule}</span>
                      <select
                        value={statuts[eleve.id] || 'PRESENT'}
                        onChange={(e) => setStatuts({ ...statuts, [eleve.id]: e.target.value })}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="PRESENT">✓ Présent</option>
                        <option value="ABSENT">✗ Absent</option>
                        <option value="JUSTIFIE">📄 Absence justifiée</option>
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleValiderAppel}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? 'Enregistrement...' : <><Check className="w-4 h-4" /> Valider l'appel</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
