import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { AlertCircle, Users, School, CheckCircle, BarChart3, Settings, LogOut } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

export default function DashboardSuperAdmin() {
  const { user, ecoles, logout } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState('overview')
  const [anomalies, setAnomalies] = useState([])
  const [loadingAnomalies, setLoadingAnomalies] = useState(true)
  const [stats, setStats] = useState({
    totalEcoles: 0,
    anomaliesNonResolues: 0
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.anomalies}?resolue=false`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAnomalies(data.slice(0, 10))
        setStats(prev => ({
          ...prev,
          anomaliesNonResolues: data.length,
          totalEcoles: ecoles?.length || 0
        }))
      }
    } catch (error) {
      console.error('Erreur chargement anomalies:', error)
    } finally {
      setLoadingAnomalies(false)
    }
  }

  const resolveAnomaly = async (anomalieId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.anomalies}/${anomalieId}/resoudre`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        setAnomalies(anomalies.filter(a => a.id !== anomalieId))
        setStats(prev => ({
          ...prev,
          anomaliesNonResolues: Math.max(0, prev.anomaliesNonResolues - 1)
        }))
      }
    } catch (error) {
      console.error('Erreur résolution anomalie:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">👑 Super Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Bienvenue, {user?.name}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Écoles</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalEcoles}</p>
              </div>
              <School className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Anomalies</p>
                <p className="text-3xl font-bold text-slate-900">{stats.anomaliesNonResolues}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Utilisateurs actifs</p>
                <p className="text-3xl font-bold text-slate-900">8</p>
              </div>
              <Users className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'anomalies'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚨 Anomalies
          </button>
          <button
            onClick={() => setActiveTab('ecoles')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'ecoles'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏫 Écoles
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-5 h-5 inline mr-2" />
            Paramètres
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Récapitulatif</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-600">Total élèves</p>
                  <p className="text-2xl font-bold text-blue-600">30</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-slate-600">Frais collectés</p>
                  <p className="text-2xl font-bold text-green-600">15M FCFA</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-slate-600">Frais restants</p>
                  <p className="text-2xl font-bold text-orange-600">8M FCFA</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-slate-600">Taux collecte</p>
                  <p className="text-2xl font-bold text-purple-600">65%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-red-900">Anomalies Détectées</h2>
              </div>
              <button
                onClick={loadDashboard}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition"
              >
                🔄 Actualiser
              </button>
            </div>

            {loadingAnomalies ? (
              <div className="p-8 text-center text-slate-500">Chargement...</div>
            ) : anomalies.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                <p className="text-slate-600">✅ Aucune anomalie détectée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">École</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Sources</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Écart</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map(anomalie => (
                      <tr key={anomalie.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-900">
                          {new Date(anomalie.date || Date.now()).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-900">
                          {anomalie.ecole?.nomCourt || '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {anomalie.source1} ↔ {anomalie.source2}
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-red-600">
                          {anomalie.montant ? `${(anomalie.montant / 1000).toFixed(0)}K FCFA` : '-'}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => resolveAnomaly(anomalie.id)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition"
                          >
                            ✓ Résoudre
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ecoles' && (
          <div>
            <div className="mb-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                ➕ Nouvelle école
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ecoles && ecoles.map(ecole => (
                <div key={ecole.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                  <h3 className="font-bold text-slate-900 mb-1">{ecole.nomComplet}</h3>
                  <p className="text-sm text-slate-600 mb-2">{ecole.nomCourt}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{ecole.niveau ? ecole.niveau.replace('_', ' ') : 'N/A'}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Actif</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">Éditer</button>
                    <button className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Paramètres</h2>
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-semibold text-slate-900 mb-2">Gestion des utilisateurs</h3>
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition">
                  👥 Gérer les comptes
                </button>
              </div>
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-semibold text-slate-900 mb-2">Rapports</h3>
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition">
                  📈 Exporter les données
                </button>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">À propos</h3>
                <p className="text-sm text-slate-600">TDB École v1.0 - Gestion multi-établissements</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
