import { useState, useEffect } from 'react'
import { Loader, Calendar, Eye } from 'lucide-react'
import { apiClient } from '../../api/client'

const todayISO = () => new Date().toISOString().split('T')[0]

const STATUT_LABEL = {
  PRESENT: { label: '✓ Présent', className: 'bg-green-100 text-green-700' },
  ABSENT: { label: '✗ Absent', className: 'bg-red-100 text-red-700' },
  JUSTIFIE: { label: '📄 Justifié', className: 'bg-yellow-100 text-yellow-700' }
}

export default function ConsultationPresences() {
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [eleves, setEleves] = useState([])
  const [presences, setPresences] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [dateJour, setDateJour] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (classeId) loadPresences()
  }, [classeId, dateJour])

  const loadInitial = async () => {
    setLoading(true)
    setError('')
    try {
      const [ecolesData, elevesData] = await Promise.all([apiClient.getEcoles(), apiClient.getEleves()])
      setEcoles(ecolesData)
      setEleves(elevesData)
      if (ecolesData.length > 0) setEcoleId(ecolesData[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ecoleId) return
    apiClient.getClasses()
      .then(data => {
        const classesEcole = data.filter(c => c.ecoleId === ecoleId)
        setClasses(classesEcole)
        setClasseId(classesEcole[0]?.id || '')
      })
      .catch(err => setError(err.message || 'Erreur lors du chargement des classes'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecoleId])

  const loadPresences = async () => {
    setError('')
    try {
      const data = await apiClient.getPresences({ ecoleId, classeId, date: dateJour })
      setPresences(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des présences')
    }
  }

  const elevesClasse = eleves.filter(e => e.classeId === classeId)
  const presenceParEleve = new Map(presences.map(p => [p.eleveId, p]))

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
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-5 h-5" /> Présences des élèves
          </h2>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
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

        {ecoles.length === 0 ? (
          <p className="text-slate-500">Aucune école ne vous est affectée.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
              <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
              <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>
        )}

        {classeId && (
          elevesClasse.length === 0 ? (
            <p className="text-slate-500">Aucun élève dans cette classe</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Élève</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Matricule</th>
                    <th className="px-4 py-2 text-center font-semibold text-slate-700">Statut du {new Date(dateJour).toLocaleDateString('fr-FR')}</th>
                  </tr>
                </thead>
                <tbody>
                  {elevesClasse.map(eleve => {
                    const p = presenceParEleve.get(eleve.id)
                    const info = p ? STATUT_LABEL[p.statut] : null
                    return (
                      <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-900">{eleve.prenom} {eleve.nom}</td>
                        <td className="px-4 py-2 text-slate-500">{eleve.matricule}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${info?.className || 'bg-slate-100 text-slate-500'}`}>
                            {info?.label || 'Non renseigné'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
