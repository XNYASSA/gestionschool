import { useState, useEffect } from 'react'
import { DollarSign, Plus, Eye, Loader } from 'lucide-react'
import { apiClient } from '../../api/client'

const todayISO = () => new Date().toISOString().split('T')[0]

export default function SaisieFraisSecretaire() {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [saisies, setSaisies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ montantTotal: '', description: '', detailedEntries: '' })

  useEffect(() => {
    loadEcoles()
  }, [])

  useEffect(() => {
    if (ecoleId) loadSaisies()
  }, [ecoleId])

  const loadEcoles = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getEcoles()
      setEcoles(data)
      if (data.length > 0) setEcoleId(data[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    } finally {
      setLoading(false)
    }
  }

  const loadSaisies = async () => {
    try {
      const data = await apiClient.getSaisiesQuotidiennes(ecoleId, { type: 'FRAIS_COLLECTES', date: todayISO() })
      setSaisies(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des saisies')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ecoleId) return

    try {
      await apiClient.creerSaisieQuotidienne(ecoleId, {
        date: new Date().toISOString(),
        type: 'FRAIS_COLLECTES',
        donnees: {
          montantTotal: parseInt(formData.montantTotal),
          description: formData.description,
          detailedEntries: formData.detailedEntries.split('\n').filter(Boolean)
        }
      })
      setFormData({ montantTotal: '', description: '', detailedEntries: '' })
      setShowForm(false)
      loadSaisies()
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement")
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
      <h2 className="text-2xl font-bold text-slate-900">💵 Saisie Frais</h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}

      <div className="flex justify-between items-center flex-wrap gap-4">
        {ecoles.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Établissement :</label>
            <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg bg-white">
              {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Enregistrer frais
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Détails (un par ligne)</label>
              <textarea
                value={formData.detailedEntries}
                onChange={(e) => setFormData({ ...formData, detailedEntries: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                rows="4"
                placeholder={"Ex:\nMAT001 - Jean Dupont - 500000 FCFA\nMAT002 - Marie Martin - 250000 FCFA"}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                Enregistrer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition">
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
          <div className="p-8 text-center text-slate-500">Aucun enregistrement pour aujourd'hui</div>
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
                    <td className="px-6 py-3 text-sm text-slate-900">{new Date(saisie.createdAt).toLocaleTimeString('fr-FR')}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{saisie.donnees?.description}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-right text-slate-900">{saisie.donnees?.montantTotal?.toLocaleString('fr-FR')} FCFA</td>
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
  )
}
