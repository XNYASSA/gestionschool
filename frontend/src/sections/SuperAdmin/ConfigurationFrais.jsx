import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Loader, School, Calendar } from 'lucide-react'
import { apiClient } from '../../api/client'

const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`
const toDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : ''

export default function ConfigurationFrais() {
  const [ecoles, setEcoles] = useState([])
  const [selectedEcoleId, setSelectedEcoleId] = useState('')
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [montantInscription, setMontantInscription] = useState('')
  const [dateLimiteInscription, setDateLimiteInscription] = useState('')
  const [tranches, setTranches] = useState([]) // édition locale : { numero, montant, dateLimite }
  const [newTrancheMontant, setNewTrancheMontant] = useState('')
  const [newTrancheDate, setNewTrancheDate] = useState('')

  useEffect(() => {
    loadEcoles()
  }, [])

  useEffect(() => {
    if (selectedEcoleId) loadConfig(selectedEcoleId)
  }, [selectedEcoleId])

  const loadEcoles = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getEcoles()
      setEcoles(data)
      if (data.length > 0) setSelectedEcoleId(data[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async (ecoleId) => {
    setLoadingConfig(true)
    setError('')
    setMessage('')
    try {
      const data = await apiClient.getConfigurationFraisByEcole(ecoleId)
      setConfig(data)
      setMontantInscription(data.montantInscription)
      setDateLimiteInscription(toDateInput(data.dateLimiteInscription))
      setTranches(data.tranches.map(t => ({ numero: t.numero, montant: t.montant, dateLimite: toDateInput(t.dateLimite) })))
    } catch (err) {
      setConfig(null)
      setMontantInscription(50000)
      setDateLimiteInscription('')
      setTranches([])
    } finally {
      setLoadingConfig(false)
    }
  }

  const handleCreateConfig = async () => {
    try {
      const created = await apiClient.createConfigurationFrais({
        ecoleId: selectedEcoleId,
        montantInscription: parseInt(montantInscription) || 50000,
        tranches: [{ montant: 250000 }, { montant: 250000 }, { montant: 250000 }]
      })
      setMessage('Configuration créée avec succès')
      setConfig(created)
      loadConfig(selectedEcoleId)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleSaveInscription = async () => {
    try {
      await apiClient.updateConfigurationFrais(config.id, {
        montantInscription: parseInt(montantInscription),
        dateLimiteInscription: dateLimiteInscription || null
      })
      setMessage('Frais d\'inscription mis à jour')
      loadConfig(selectedEcoleId)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleSaveTranche = async (tranche) => {
    try {
      await apiClient.updateTranche(config.id, tranche.numero, parseInt(tranche.montant), tranche.dateLimite || null)
      setMessage(`Tranche ${tranche.numero} mise à jour`)
      loadConfig(selectedEcoleId)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDeleteTranche = async (numero) => {
    if (!confirm(`Supprimer la tranche ${numero} ?`)) return
    try {
      await apiClient.deleteTranche(config.id, numero)
      loadConfig(selectedEcoleId)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleAddTranche = async () => {
    if (!newTrancheMontant) {
      alert('Veuillez indiquer un montant pour la nouvelle tranche')
      return
    }
    try {
      await apiClient.addTranche(config.id, parseInt(newTrancheMontant), newTrancheDate || null)
      setNewTrancheMontant('')
      setNewTrancheDate('')
      loadConfig(selectedEcoleId)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const updateTrancheLocal = (numero, field, value) => {
    setTranches(tranches.map(t => t.numero === numero ? { ...t, [field]: value } : t))
  }

  const totalTranches = tranches.reduce((sum, t) => sum + (parseInt(t.montant) || 0), 0)
  const totalGeneral = (parseInt(montantInscription) || 0) + totalTranches

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">⚙️ Configuration des frais</h2>
      <p className="text-sm text-slate-500 -mt-4">
        Définissez le montant des frais d'inscription, le nombre de tranches de pension, leur montant et leur date limite de paiement, pour chaque école.
      </p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      {/* Sélecteur d'école */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          <School className="w-4 h-4 text-blue-600" /> École
        </label>
        <select
          value={selectedEcoleId}
          onChange={(e) => setSelectedEcoleId(e.target.value)}
          className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg"
        >
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
      </div>

      {loadingConfig ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement de la configuration...
        </div>
      ) : !config ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
          <p className="text-slate-600">Aucune configuration de frais pour cette école.</p>
          <button
            onClick={handleCreateConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Créer une configuration par défaut
          </button>
        </div>
      ) : (
        <>
          {/* Frais d'inscription */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-slate-900 mb-4">📝 Frais d'inscription</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA)</label>
                <input
                  type="number"
                  value={montantInscription}
                  onChange={(e) => setMontantInscription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" /> Date limite de règlement
                </label>
                <input
                  type="date"
                  value={dateLimiteInscription}
                  onChange={(e) => setDateLimiteInscription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleSaveInscription}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </div>

          {/* Tranches de pension */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">💰 Tranches de pension ({tranches.length})</h3>
            </div>

            {tranches.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Aucune tranche configurée</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Tranche</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Montant (FCFA)</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Date limite de règlement</th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tranches.map(t => (
                      <tr key={t.numero} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-900 font-medium">Tranche {t.numero}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={t.montant}
                            onChange={(e) => updateTrancheLocal(t.numero, 'montant', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="date"
                            value={t.dateLimite}
                            onChange={(e) => updateTrancheLocal(t.numero, 'dateLimite', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSaveTranche(t)}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600 transition"
                              title="Enregistrer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTranche(t.numero)}
                              className="p-1 hover:bg-red-100 rounded text-red-600 transition"
                              title="Supprimer la tranche"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ajouter une tranche */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nouvelle tranche — montant (FCFA)</label>
                <input
                  type="number"
                  value={newTrancheMontant}
                  onChange={(e) => setNewTrancheMontant(e.target.value)}
                  className="w-40 px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date limite</label>
                <input
                  type="date"
                  value={newTrancheDate}
                  onChange={(e) => setNewTrancheDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleAddTranche}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter une tranche
              </button>
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <p className="font-bold text-slate-900">
                Montant total (inscription + tranches) : <span className="text-blue-600">{formatFCFA(totalGeneral)}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
