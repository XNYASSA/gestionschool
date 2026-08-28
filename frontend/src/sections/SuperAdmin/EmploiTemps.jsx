import { useState, useEffect, useMemo } from 'react'
import { Clock, Loader, School } from 'lucide-react'
import { apiClient } from '../../api/client'

const JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI']
const JOURS_LABELS = { LUNDI: 'Lun', MARDI: 'Mar', MERCREDI: 'Mer', JEUDI: 'Jeu', VENDREDI: 'Ven', SAMEDI: 'Sam' }

export default function EmploiTemps() {
  const [resume, setResume] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtreEcole, setFiltreEcole] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getResumeRH()
      setResume(data)
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de l'emploi du temps du personnel")
    } finally {
      setLoading(false)
    }
  }

  const ecoles = useMemo(() => [...new Set(resume.map(r => r.ecoleNom))].sort(), [resume])
  const filtres = useMemo(() => resume.filter(r => !filtreEcole || r.ecoleNom === filtreEcole), [resume, filtreEcole])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Clock className="w-6 h-6 text-indigo-500" /> Emploi du temps & présence du personnel
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      ) : resume.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
          Aucun emploi du temps ou présence n'a encore été saisi par le Surveillant Général.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-slate-500" />
            <select
              value={filtreEcole}
              onChange={(e) => setFiltreEcole(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Toutes les écoles</option>
              {ecoles.map(nom => <option key={nom} value={nom}>{nom}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">École</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Employé</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rôle</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Emploi du temps</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Présence (30j)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Absences</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Retards</th>
                  </tr>
                </thead>
                <tbody>
                  {filtres.map(emp => (
                    <tr key={emp.utilisateurId} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{emp.ecoleNom}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{emp.nom}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{emp.role}</td>
                      <td className="px-4 py-3">
                        {emp.horaires.length === 0 ? (
                          <span className="text-xs text-slate-400 block text-center">Non défini</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {JOURS.filter(j => emp.horaires.some(h => h.jour === j)).map(j => {
                              const h = emp.horaires.find(h => h.jour === j)
                              return (
                                <span key={j} title={`${h.heureDebut} - ${h.heureFin}`} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                  {JOURS_LABELS[j]}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {emp.tauxPresence === null ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            emp.tauxPresence >= 90 ? 'bg-green-100 text-green-700' : emp.tauxPresence >= 70 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {emp.tauxPresence}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-red-600 font-semibold">{emp.absences}</td>
                      <td className="px-4 py-3 text-center text-sm text-orange-600 font-semibold">{emp.retards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
