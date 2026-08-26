import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { FileText, DollarSign, Plus, Eye } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

export default function DashboardSecretaire() {
  const { ecoleSelectionnee, selectEcole, ecoles } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState('frais')
  const [saisies, setSaisies] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    montantTotal: '',
    description: '',
    detailedEntries: ''
  })

  useEffect(() => {
    if (ecoleSelectionnee) {
      loadSaisies()
    }
  }, [ecoleSelectionnee])

  const loadSaisies = async () => {
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
        setSaisies(await response.json())
      }
    } catch (error) {
      console.error('Erreur chargement saisies:', error)
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
            montantTotal: parseInt(formData.montantTotal),
            description: formData.description,
            detailedEntries: formData.detailedEntries.split('\n')
          }
        })
      })

      if (response.ok) {
        setFormData({ montantTotal: '', description: '', detailedEntries: '' })
        setShowForm(false)
        loadSaisies()
      }
    } catch (error) {
      console.error('Erreur envoi saisie:', error)
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
            <h1 className="text-4xl font-bold text-slate-900 mb-2">👩‍💻 Secrétaire - Saisie Frais</h1>
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

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('frais')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'frais'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saisie Frais
          </button>
          <button
            onClick={() => setActiveTab('reception')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'reception'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Réceptions établies
          </button>
        </div>

        {/* Frais Tab */}
        {activeTab === 'frais' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Enregistrer frais
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Enregistrer frais collectés</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Montant total (FCFA)</label>
                    <input
                      type="number"
                      value={formData.montantTotal}
                      onChange={(e) => setFormData({ ...formData, montantTotal: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: 2500000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: Paiements lundi"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Détails (un par ligne)
                    </label>
                    <textarea
                      value={formData.detailedEntries}
                      onChange={(e) => setFormData({ ...formData, detailedEntries: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                      rows="4"
                      placeholder="Ex:&#10;MAT001 - Jean Dupont - 500000 FCFA&#10;MAT002 - Marie Martin - 250000 FCFA"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Enregistrer
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

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">Frais d'aujourd'hui</h3>
              </div>

              {saisies.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Aucun enregistrement pour aujourd'hui
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Heure</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">Montant</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saisies.map(saisie => (
                        <tr key={saisie.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-900">
                            {new Date(saisie.createdAt).toLocaleTimeString('fr-FR')}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-900">
                            {saisie.donnees?.description}
                          </td>
                          <td className="px-6 py-3 text-sm font-semibold text-right text-slate-900">
                            {saisie.donnees?.montantTotal?.toLocaleString('fr-FR')} FCFA
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
        )}

        {/* Reception Tab */}
        {activeTab === 'reception' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Réceptions établies</h3>
            <p className="text-slate-600">Historique des réceptions établies par les parents/tuteurs</p>
            {/* À implémenter */}
          </div>
        )}
      </div>
    </div>
  )
}
