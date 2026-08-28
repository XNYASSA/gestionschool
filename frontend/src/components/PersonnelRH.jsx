import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { apiClient } from '../api/client'

const JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI']
const JOURS_LABELS = { LUNDI: 'Lundi', MARDI: 'Mardi', MERCREDI: 'Mercredi', JEUDI: 'Jeudi', VENDREDI: 'Vendredi', SAMEDI: 'Samedi' }
const todayISO = () => new Date().toISOString().split('T')[0]

// Gestion de l'emploi du temps et des présences/absences du personnel (enseignants + administratifs)
// d'une école — utilisé par les rôles Surveillant Général, Secrétaire, Principal/Directrice.
// vue: 'horaires' ou 'presences' — chaque vue est un élément distinct de la barre latérale.
export default function PersonnelRH({ vue }) {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [employes, setEmployes] = useState([])
  const [selectedEmploye, setSelectedEmploye] = useState('')
  const [horaireForm, setHoraireForm] = useState({})
  const [dateJour, setDateJour] = useState(todayISO())
  const [presenceForm, setPresenceForm] = useState({})
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState('')

  useEffect(() => {
    loadEcoles()
  }, [])

  useEffect(() => {
    if (ecoleId) {
      loadEmployes()
    }
  }, [ecoleId])

  useEffect(() => {
    if (selectedEmploye) {
      loadHoraires()
    }
  }, [selectedEmploye])

  useEffect(() => {
    if (ecoleId && vue === 'presences') {
      loadPresences()
    }
  }, [ecoleId, vue, dateJour, employes])

  const loadEcoles = async () => {
    setError('')
    try {
      const data = await apiClient.getEcoles()
      setEcoles(data)
      if (data.length > 0) setEcoleId(data[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    }
  }

  const loadEmployes = async () => {
    setError('')
    try {
      const data = await apiClient.getEmployesEcole(ecoleId)
      setEmployes(data)
      setSelectedEmploye(data.length > 0 ? data[0].utilisateurId : '')
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des employés')
    }
  }

  const loadHoraires = async () => {
    try {
      const data = await apiClient.getHoraires(ecoleId, selectedEmploye)
      const form = {}
      JOURS.forEach(jour => {
        const h = data.find(d => d.jour === jour)
        form[jour] = { heureDebut: h?.heureDebut || '', heureFin: h?.heureFin || '' }
      })
      setHoraireForm(form)
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de l'emploi du temps")
    }
  }

  const loadPresences = async () => {
    try {
      const data = await apiClient.getPresencesPersonnel(ecoleId, dateJour)
      const form = {}
      employes.forEach(emp => {
        const p = data.find(d => d.utilisateurId === emp.utilisateurId)
        form[emp.utilisateurId] = {
          statut: p?.statut || 'PRESENT',
          heureArrivee: p?.heureArrivee || '',
          heureDepart: p?.heureDepart || '',
          observation: p?.observation || ''
        }
      })
      setPresenceForm(form)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des présences')
    }
  }

  const handleSaveHoraire = async (jour) => {
    const { heureDebut, heureFin } = horaireForm[jour] || {}
    if (!heureDebut || !heureFin) return

    try {
      await apiClient.upsertHoraire({ utilisateurId: selectedEmploye, ecoleId, jour, heureDebut, heureFin })
      setSavedId(`horaire-${jour}`)
      setTimeout(() => setSavedId(''), 1500)
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement de l'horaire")
    }
  }

  const handleSavePresence = async (utilisateurId) => {
    const data = presenceForm[utilisateurId]
    if (!data) return

    try {
      await apiClient.upsertPresencePersonnel({
        utilisateurId,
        ecoleId,
        date: dateJour,
        ...data
      })
      setSavedId(`presence-${utilisateurId}`)
      setTimeout(() => setSavedId(''), 1500)
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement de la présence")
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">
        {vue === 'presences' ? '👥 Présences du personnel' : '🕐 Emploi du temps du personnel'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {ecoles.length > 1 && (
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Établissement :</label>
          <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg">
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
        </div>
      )}

      {!ecoleId ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">Aucune école disponible</div>
      ) : vue === 'horaires' ? (
        employes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">Aucun employé dans cette école</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Employé</label>
              <select
                value={selectedEmploye}
                onChange={(e) => setSelectedEmploye(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                {employes.map(emp => (
                  <option key={emp.utilisateurId} value={emp.utilisateurId}>
                    {emp.nom} — {emp.fonction || emp.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-900">
                Horaire hebdomadaire
              </div>
              <div className="divide-y divide-slate-200">
                {JOURS.map(jour => (
                  <div key={jour} className="flex items-center gap-4 p-4">
                    <span className="w-24 font-medium text-slate-700">{JOURS_LABELS[jour]}</span>
                    <input
                      type="time"
                      value={horaireForm[jour]?.heureDebut || ''}
                      onChange={(e) => setHoraireForm({ ...horaireForm, [jour]: { ...horaireForm[jour], heureDebut: e.target.value } })}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <span className="text-slate-500">à</span>
                    <input
                      type="time"
                      value={horaireForm[jour]?.heureFin || ''}
                      onChange={(e) => setHoraireForm({ ...horaireForm, [jour]: { ...horaireForm[jour], heureFin: e.target.value } })}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <button
                      onClick={() => handleSaveHoraire(jour)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
                    >
                      {savedId === `horaire-${jour}` ? <Check className="w-4 h-4" /> : 'Enregistrer'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Date :</label>
            <input
              type="date"
              value={dateJour}
              max={todayISO()}
              onChange={(e) => setDateJour(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {employes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">Aucun employé dans cette école</div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Employé</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Statut</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Arrivée</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Départ</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Observation</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employes.map(emp => {
                      const form = presenceForm[emp.utilisateurId] || { statut: 'PRESENT', heureArrivee: '', heureDepart: '', observation: '' }
                      return (
                        <tr key={emp.utilisateurId} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-900 font-medium">{emp.nom}</td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={form.statut}
                              onChange={(e) => setPresenceForm({ ...presenceForm, [emp.utilisateurId]: { ...form, statut: e.target.value } })}
                              className="px-2 py-1 border border-slate-300 rounded-lg"
                            >
                              <option value="PRESENT">✓ Présent</option>
                              <option value="RETARD">⚠ Retard</option>
                              <option value="ABSENT">✗ Absent</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="time"
                              value={form.heureArrivee}
                              onChange={(e) => setPresenceForm({ ...presenceForm, [emp.utilisateurId]: { ...form, heureArrivee: e.target.value } })}
                              className="px-2 py-1 border border-slate-300 rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="time"
                              value={form.heureDepart}
                              onChange={(e) => setPresenceForm({ ...presenceForm, [emp.utilisateurId]: { ...form, heureDepart: e.target.value } })}
                              className="px-2 py-1 border border-slate-300 rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={form.observation}
                              onChange={(e) => setPresenceForm({ ...presenceForm, [emp.utilisateurId]: { ...form, observation: e.target.value } })}
                              className="w-full px-2 py-1 border border-slate-300 rounded-lg"
                              placeholder="Facultatif"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleSavePresence(emp.utilisateurId)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1 mx-auto"
                            >
                              {savedId === `presence-${emp.utilisateurId}` ? <Check className="w-4 h-4" /> : 'Enregistrer'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
