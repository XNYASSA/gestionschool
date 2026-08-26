import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { BarChart3, Plus, Eye } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

export default function DashboardEconomat() {
  const { ecoleSelectionnee, selectEcole, ecoles } = useContext(AuthContext)
  const [saisies, setSaisies] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    montantVerifie: '',
    numeroCompte: '',
    notes: ''
  })
  const [stats, setStats] = useState({
    totalCollecte: 0,
    totalVerse: 0,
    difference: 0
  })

  useEffect(() => {
    if (ecoleSelectionnee) {
      loadDashboard()
    }
  }, [ecoleSelectionnee])

  const loadDashboard = async () => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.saisiesQuotidiennes}/${ecoleSelectionnee.id}?type=FRAIS_COLLECTES&date=${new Date().toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setSaisies(data)

        // Calculer statistiques
        const totalCollecte = data.reduce((sum, s) => sum + (s.donnees?.montantTotal || 0), 0)
        const totalVerse = data.reduce((sum, s) => sum + (parseInt(formData.montantVerifie) || 0), 0)

        setStats({
          totalCollecte,
          totalVerse,
          difference: totalCollecte - totalVerse
        })
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ecoleSelectionnee) return

    try {
      const response = await fetch(`${API_ENDPOINTS.saisiesQuotidiennes}/${ecoleSelectionnee.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: new Date().toISOString(),
          type: 'FRAIS_COLLECTES',
          donnees: {
            montantVerifie: parseInt(formData.montantVerifie),
            numeroCompte: formData.numeroCompte,
            notes: formData.notes,
            type: 'VERIFICATION_BANCAIRE'
          }
        })
      })

      if (response.ok) {
        setFormData({ montantVerifie: '', numeroCompte: '', notes: '' })
        setShowForm(false)
        loadDashboard()
      }
    } catch (error) {
      console.error('Erreur envoi vérification:', error)
    }
  }

  if (!ecoleSelectionnee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="text-center text-slate-600">Veuillez sélectionner une école</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">💰 Économat - Vérification Financière</h1>
            <p className="text-slate-600">{ecoleSelectionnee.nomComplet}</p>
          </div>

          {ecoles.length > 1 && (
            <select
              value={ecoleSelectionnee.id}
              onChange={(e) => selectEcole(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {ecoles.map(ecole => (
                <option key={ecole.id} value={ecole.id}>
                  {ecole.nomCourt}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total collecté (déclaré)</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(stats.totalCollecte / 1000).toFixed(0)}K FCFA
                </p>
              </div>
              <BarChart3 className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total vérifié (bancaire)</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(stats.totalVerse / 1000).toFixed(0)}K FCFA
                </p>
              </div>
              <BarChart3 className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${stats.difference === 0 ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Écart</p>
                <p className={`text-2xl font-bold ${stats.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(stats.difference / 1000).toFixed(0)}K FCFA
                </p>
              </div>
              <BarChart3 className={`w-12 h-12 ${stats.difference === 0 ? 'text-green-500' : 'text-red-500'} opacity-20`} />
            </div>
          </div>
        </div>

        {/* Saisie Form */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Vérifier montant
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Vérification bancaire</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant versé (FCFA)</label>
                <input
                  type="number"
                  value={formData.montantVerifie}
                  onChange={(e) => setFormData({ ...formData, montantVerifie: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: 2400000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de compte / Référence</label>
                <input
                  type="text"
                  value={formData.numeroCompte}
                  onChange={(e) => setFormData({ ...formData, numeroCompte: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: COMPTE-XXX-YYY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Observations</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows="3"
                  placeholder="Ex: Versement effectué le 25/01, manque 100K FCFA..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Enregistrer vérification
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vérifications Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">Vérifications d'aujourd'hui</h3>
          </div>

          {saisies.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucune vérification pour aujourd'hui
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Heure</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Montant déclaré</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Numéro compte</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Statut</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {saisies.map(saisie => (
                    <tr key={saisie.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm text-slate-900">
                        {new Date(saisie.createdAt).toLocaleTimeString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                        {saisie.donnees?.montantTotal?.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900">
                        {saisie.donnees?.numeroCompte || '-'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          saisie.validee
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {saisie.validee ? 'Vérifiée' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
