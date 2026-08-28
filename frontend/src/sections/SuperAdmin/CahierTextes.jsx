import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Loader, School, Users, User } from 'lucide-react'
import { apiClient } from '../../api/client'

const VUE_LABELS = { ecole: 'Par école', classe: 'Par classe', enseignant: 'Par enseignant' }

export default function CahierTextes() {
  const [progression, setProgression] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vue, setVue] = useState('ecole')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getProgressionLecons()
      setProgression(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement de la progression des programmes')
    } finally {
      setLoading(false)
    }
  }

  const groupes = useMemo(() => {
    const clé = vue === 'ecole' ? 'ecoleNom' : vue === 'classe' ? 'classeNom' : 'enseignantNom'
    const map = new Map()

    for (const row of progression) {
      const label = row[clé]
      if (!map.has(label)) {
        map.set(label, { label, faites: 0, prevues: 0, lignes: [] })
      }
      const g = map.get(label)
      g.faites += row.nombreLeconsFaites
      g.prevues += row.nombreLeconsPrevues
      g.lignes.push(row)
    }

    return Array.from(map.values())
      .map(g => ({ ...g, pourcentage: g.prevues > 0 ? Math.min(100, Math.round((g.faites / g.prevues) * 100)) : 0 }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [progression, vue])

  const globalFaites = progression.reduce((s, r) => s + r.nombreLeconsFaites, 0)
  const globalPrevues = progression.reduce((s, r) => s + r.nombreLeconsPrevues, 0)
  const globalPourcentage = globalPrevues > 0 ? Math.min(100, Math.round((globalFaites / globalPrevues) * 100)) : 0

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-orange-500" /> Cahier de textes — Progression des programmes
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      ) : progression.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
          Aucune affectation enseignant/classe/matière n'a encore de leçons ou d'objectif défini.
        </div>
      ) : (
        <>
          {/* Résumé global */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">Progression globale</span>
              <span className="text-2xl font-bold text-orange-600">{globalPourcentage}%</span>
            </div>
            <ProgressBar pourcentage={globalPourcentage} />
            <p className="text-sm text-slate-500 mt-2">
              {globalFaites} leçon(s) faite(s) sur {globalPrevues} prévue(s) — {Math.max(0, globalPrevues - globalFaites)} restante(s)
            </p>
          </div>

          {/* Sélecteur de vue */}
          <div className="flex gap-2">
            {Object.entries(VUE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setVue(key)}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  vue === key ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {key === 'ecole' && <School className="w-4 h-4" />}
                {key === 'classe' && <Users className="w-4 h-4" />}
                {key === 'enseignant' && <User className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>

          {/* Cartes par groupe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupes.map(g => (
              <div key={g.label} className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{g.label}</span>
                  <span className="text-lg font-bold text-orange-600">{g.pourcentage}%</span>
                </div>
                <ProgressBar pourcentage={g.pourcentage} />
                <p className="text-xs text-slate-500 mt-2">
                  {g.faites} faite(s) · {Math.max(0, g.prevues - g.faites)} restante(s) sur {g.prevues} prévue(s)
                </p>
              </div>
            ))}
          </div>

          {/* Détail par affectation (enseignant + classe + matière) */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">
              Détail par affectation
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">École</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">Classe</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">Enseignant</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">Matière</th>
                    <th className="px-5 py-3 text-center text-sm font-semibold text-slate-700">Faites / Prévues</th>
                    <th className="px-5 py-3 text-center text-sm font-semibold text-slate-700">Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {progression.map(row => (
                    <tr key={row.ecmId} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-900">{row.ecoleNom}</td>
                      <td className="px-5 py-3 text-sm text-slate-900">{row.classeNom}</td>
                      <td className="px-5 py-3 text-sm text-slate-900">{row.enseignantNom}</td>
                      <td className="px-5 py-3 text-sm text-slate-900">{row.matiereNom}</td>
                      <td className="px-5 py-3 text-sm text-center text-slate-700">
                        {row.nombreLeconsFaites} / {row.nombreLeconsPrevues}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[80px]"><ProgressBar pourcentage={row.pourcentage} compact /></div>
                          <span className="text-xs font-semibold text-slate-700 w-10 text-right">{row.pourcentage}%</span>
                        </div>
                      </td>
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

function ProgressBar({ pourcentage, compact = false }) {
  const couleur = pourcentage >= 75 ? 'bg-green-500' : pourcentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className={`w-full bg-slate-200 rounded-full ${compact ? 'h-1.5' : 'h-2.5'}`}>
      <div className={`${couleur} ${compact ? 'h-1.5' : 'h-2.5'} rounded-full transition-all`} style={{ width: `${pourcentage}%` }} />
    </div>
  )
}
