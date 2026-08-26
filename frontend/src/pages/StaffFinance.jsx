import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { apiClient } from '../api/client'
import { Users, DollarSign, Plus, Edit2, Trash2, Lock, Unlock, AlertCircle, Save, X, TrendingUp, TrendingDown, Loader } from 'lucide-react'
import { formatFCFALong } from '../utils/formatters'
import { useDashboard } from '../hooks/useDashboard'

const CATEGORIES_DEPENSES = [
  { value: 'MATERIEL', label: '🖥️ Matériel' },
  { value: 'FOURNITURES', label: '📚 Fournitures' },
  { value: 'MAINTENANCE', label: '🔧 Maintenance' },
  { value: 'ENERGIE', label: '⚡ Énergie (Électricité/Eau)' },
  { value: 'AUTRE', label: '📦 Autre' }
]

export default function StaffFinance({ filters }) {
  const { user } = useContext(AuthContext)
  const { data: dashboardData } = useDashboard()
  const [personnel, setPersonnel] = useState([])
  const [depenses, setDepenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showDepenseForm, setShowDepenseForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingDepenseId, setEditingDepenseId] = useState(null)
  const [actioningId, setActioningId] = useState(null)

  const [formData, setFormData] = useState({
    nom: '',
    fonction: '',
    telephone: '',
    salaireMensuel: '',
    dateEmbauche: new Date().toISOString().split('T')[0]
  })

  const [depenseFormData, setDepenseFormData] = useState({
    description: '',
    categorie: 'AUTRE',
    montant: '',
    dateDepense: new Date().toISOString().split('T')[0]
  })

  // Charger le personnel et les dépenses
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [personnelData, depensesData] = await Promise.all([
        apiClient.getPersonnel(),
        apiClient.getDepenses()
      ])
      setPersonnel(personnelData || [])
      setDepenses(depensesData || [])
    } catch (err) {
      setError('Erreur chargement données')
    } finally {
      setLoading(false)
    }
  }

  const fetchPersonnel = async () => {
    try {
      const data = await apiClient.getPersonnel()
      setPersonnel(data || [])
    } catch (err) {
      setError('Erreur chargement personnel')
    }
  }

  const fetchDepenses = async () => {
    try {
      const data = await apiClient.getDepenses()
      setDepenses(data || [])
    } catch (err) {
      setError('Erreur chargement dépenses')
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.nom || !formData.fonction || !formData.telephone || !formData.salaireMensuel) {
        setError('Tous les champs sont obligatoires')
        return
      }

      const dataToSend = {
        ...formData,
        salaireMensuel: parseInt(formData.salaireMensuel)
      }

      if (editingId) {
        await apiClient.updatePersonnel(editingId, dataToSend)
      } else {
        await apiClient.createPersonnel(dataToSend)
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ nom: '', fonction: '', telephone: '', salaireMensuel: '', dateEmbauche: new Date().toISOString().split('T')[0] })
      await fetchPersonnel()
    } catch (err) {
      setError(err.message || 'Erreur sauvegarde')
    }
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setFormData({
      nom: p.nom,
      fonction: p.fonction,
      telephone: p.telephone,
      salaireMensuel: p.salaireMensuel,
      dateEmbauche: p.dateEmbauche?.split('T')[0] || ''
    })
    setShowForm(true)
  }

  const handleToggleStatut = async (id) => {
    setActioningId(id)
    try {
      await apiClient.togglePersonnelStatut(id)
      await fetchPersonnel()
    } catch (err) {
      setError('Erreur changement statut')
    } finally {
      setActioningId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce personnel?')) return
    setActioningId(id)
    try {
      await apiClient.deletePersonnel(id)
      await fetchPersonnel()
    } catch (err) {
      setError('Erreur suppression')
    } finally {
      setActioningId(null)
    }
  }

  // DÉPENSES
  const handleDepenseFormChange = (e) => {
    const { name, value } = e.target
    setDepenseFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDepenseSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!depenseFormData.description || !depenseFormData.montant) {
        setError('Tous les champs sont obligatoires')
        return
      }

      const dataToSend = {
        ...depenseFormData,
        montant: parseInt(depenseFormData.montant)
      }

      if (editingDepenseId) {
        await apiClient.updateDepense(editingDepenseId, dataToSend)
      } else {
        await apiClient.createDepense(dataToSend)
      }

      setShowDepenseForm(false)
      setEditingDepenseId(null)
      setDepenseFormData({ description: '', categorie: 'AUTRE', montant: '', dateDepense: new Date().toISOString().split('T')[0] })
      await fetchDepenses()
    } catch (err) {
      setError(err.message || 'Erreur sauvegarde dépense')
    }
  }

  const handleEditDepense = (d) => {
    setEditingDepenseId(d.id)
    setDepenseFormData({
      description: d.description,
      categorie: d.categorie,
      montant: d.montant,
      dateDepense: d.dateDepense?.split('T')[0] || ''
    })
    setShowDepenseForm(true)
  }

  const handleDeleteDepense = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) return
    setActioningId(id)
    try {
      await apiClient.deleteDepense(id)
      await fetchDepenses()
    } catch (err) {
      setError('Erreur suppression dépense')
    } finally {
      setActioningId(null)
    }
  }

  const totalSalaries = personnel.reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)
  const avgSalary = personnel.length > 0 ? totalSalaries / personnel.length : 0
  const activePersonnel = personnel.filter(p => p.actif).length

  // Données financières
  const frais = dashboardData?.frais || []
  const totalFraisCollectes = frais.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
  const totalFraisDus = frais.reduce((sum, f) => sum + (f.montantDu || 0), 0)
  const totalFraisRestants = totalFraisDus - totalFraisCollectes

  // Dépenses par catégorie
  const depenseParCategorie = {}
  const totalDepenses = depenses.reduce((sum, d) => {
    sum += d.montant || 0
    if (!depenseParCategorie[d.categorie]) {
      depenseParCategorie[d.categorie] = 0
    }
    depenseParCategorie[d.categorie] += d.montant
    return sum
  }, 0)

  // Bilan: Frais collectés - Salaires - Autres dépenses
  const totalDepenseHors = totalDepenses
  const bilan = totalFraisCollectes - totalSalaries - totalDepenseHors

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold text-white">👥 Personnel & Finances</h1>
        <p className="text-gray-400 mt-2">Gestion complète du personnel et des finances de l'école</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* ===== SECTION FINANCES ===== */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">💰 Finances de l'Établissement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Frais Collectés</p>
                <p className="text-2xl font-bold mt-2">{formatFCFALong(totalFraisCollectes)}</p>
                <p className="text-green-200 text-xs mt-1">Total encaissé</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Frais Restants</p>
                <p className="text-2xl font-bold mt-2">{formatFCFALong(totalFraisRestants)}</p>
                <p className="text-yellow-200 text-xs mt-1">À collecter</p>
              </div>
              <TrendingDown className="w-12 h-12 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Masse Salariale</p>
                <p className="text-2xl font-bold mt-2">{formatFCFALong(totalSalaries)}</p>
                <p className="text-red-200 text-xs mt-1">Mensuel</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-20" />
            </div>
          </div>

          <div className={`bg-gradient-to-br ${bilan >= 0 ? 'from-blue-600 to-blue-700' : 'from-orange-600 to-orange-700'} rounded-lg p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${bilan >= 0 ? 'text-blue-100' : 'text-orange-100'} text-sm font-medium`}>Bilan Net</p>
                <p className="text-2xl font-bold mt-2">{formatFCFALong(bilan)}</p>
                <p className={`${bilan >= 0 ? 'text-blue-200' : 'text-orange-200'} text-xs mt-1`}>{bilan >= 0 ? 'Excédent' : 'Déficit'}</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION PERSONNEL ===== */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">👥 Personnel ({personnel.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Personnel Total</p>
                <p className="text-3xl font-bold mt-2">{personnel.length}</p>
                <p className="text-blue-200 text-xs mt-1">{activePersonnel} actifs</p>
              </div>
              <Users className="w-12 h-12 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Masse Salariale</p>
                <p className="text-2xl font-bold mt-2">{formatFCFALong(totalSalaries)}</p>
                <p className="text-green-200 text-xs mt-1">Mensuel</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Salaire Moyen</p>
                <p className="text-2xl font-bold mt-2">{formatFCFALong(avgSalary)}</p>
                <p className="text-purple-200 text-xs mt-1">Par personne</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Inactifs</p>
                <p className="text-3xl font-bold mt-2">{personnel.length - activePersonnel}</p>
                <p className="text-orange-200 text-xs mt-1">Bloqués</p>
              </div>
              <Lock className="w-12 h-12 opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Bouton créer */}
      {(user?.role === 'owner' || user?.role === 'director') && !showForm && (
        <button
          onClick={() => {
            setEditingId(null)
            setFormData({ nom: '', fonction: '', telephone: '', salaireMensuel: '', dateEmbauche: new Date().toISOString().split('T')[0] })
            setShowForm(true)
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ajouter Personnel
        </button>
      )}

      {/* Formulaire modal */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {editingId ? '✏️ Modifier Personnel' : '➕ Nouveau Personnel'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleFormChange}
              placeholder="Nom complet *"
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500"
              required
            />

            <input
              type="text"
              name="fonction"
              value={formData.fonction}
              onChange={handleFormChange}
              placeholder="Fonction *"
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500"
              required
            />

            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleFormChange}
              placeholder="Téléphone *"
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500"
              required
            />

            <input
              type="number"
              name="salaireMensuel"
              value={formData.salaireMensuel}
              onChange={handleFormChange}
              placeholder="Salaire mensuel *"
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500"
              required
            />

            <input
              type="date"
              name="dateEmbauche"
              value={formData.dateEmbauche}
              onChange={handleFormChange}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 md:col-span-2"
            />

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Modifier' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste personnel */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">Chargement...</div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-white">Nom</th>
                  <th className="px-4 py-3 text-left text-white">Fonction</th>
                  <th className="px-4 py-3 text-left text-white">Téléphone</th>
                  <th className="px-4 py-3 text-right text-white">Salaire Mensuel</th>
                  <th className="px-4 py-3 text-center text-white">Statut</th>
                  {(user?.role === 'owner' || user?.role === 'director') && (
                    <th className="px-4 py-3 text-center text-white">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {personnel.map(p => (
                  <tr key={p.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-semibold">{p.nom}</td>
                    <td className="px-4 py-3 text-gray-400">{p.fonction}</td>
                    <td className="px-4 py-3 text-gray-400">{p.telephone}</td>
                    <td className="px-4 py-3 text-right text-gray-300 font-bold">{formatFCFALong(p.salaireMensuel)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        p.actif ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {p.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    {(user?.role === 'owner' || user?.role === 'director') && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                            disabled={actioningId === p.id}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatut(p.id)}
                            className={`transition-colors p-1 ${
                              p.actif ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                            }`}
                            disabled={actioningId === p.id}
                            title={p.actif ? 'Bloquer' : 'Débloquer'}
                          >
                            {p.actif ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          {user?.role === 'owner' && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              disabled={actioningId === p.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-700/50">
                <tr className="font-bold">
                  <td colSpan="3" className="px-4 py-3 text-right text-white">TOTAL:</td>
                  <td className="px-4 py-3 text-right text-blue-400">{formatFCFALong(totalSalaries)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ===== SECTION DÉPENSES ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">📊 Dépenses (Matériel, Fournitures, etc.)</h2>
          <button
            onClick={() => {
              setShowDepenseForm(!showDepenseForm)
              setEditingDepenseId(null)
              setDepenseFormData({ description: '', categorie: 'AUTRE', montant: '', dateDepense: new Date().toISOString().split('T')[0] })
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter une dépense
          </button>
        </div>

        {/* Statistiques des dépenses */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 text-white">
            <p className="text-orange-100 text-sm font-medium">Total Dépenses</p>
            <p className="text-3xl font-bold mt-2">{formatFCFALong(totalDepenses)}</p>
            <p className="text-orange-200 text-xs mt-1">{depenses.length} entrées</p>
          </div>
          {CATEGORIES_DEPENSES.map(cat => (
            <div key={cat.value} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <p className="text-gray-300 text-sm font-medium">{cat.label}</p>
              <p className="text-xl font-bold text-gray-100 mt-1">
                {formatFCFALong(depenseParCategorie[cat.value] || 0)}
              </p>
            </div>
          ))}
        </div>

        {/* Formulaire ajout/modification dépense */}
        {showDepenseForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingDepenseId ? '✏️ Modifier une dépense' : '➕ Ajouter une dépense'}
            </h3>
            <form onSubmit={handleDepenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={depenseFormData.description}
                    onChange={handleDepenseFormChange}
                    placeholder="Ex: Achat de fournitures scolaires"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
                  <select
                    name="categorie"
                    value={depenseFormData.categorie}
                    onChange={handleDepenseFormChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES_DEPENSES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Montant (FCFA)</label>
                  <input
                    type="number"
                    name="montant"
                    value={depenseFormData.montant}
                    onChange={handleDepenseFormChange}
                    placeholder="50000"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    name="dateDepense"
                    value={depenseFormData.dateDepense}
                    onChange={handleDepenseFormChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowDepenseForm(false)
                    setEditingDepenseId(null)
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tableau des dépenses */}
        {depenses.length > 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700 border-b border-gray-600">
                    <th className="px-4 py-3 text-left font-semibold text-white">N°</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Catégorie</th>
                    <th className="px-4 py-3 text-right font-semibold text-white">Montant</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Date</th>
                    <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {depenses.map((dep, idx) => {
                    const cat = CATEGORIES_DEPENSES.find(c => c.value === dep.categorie)
                    return (
                      <tr key={dep.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 text-gray-300">{dep.description}</td>
                        <td className="px-4 py-3 text-gray-400">{cat?.label}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-400">
                          {formatFCFALong(dep.montant)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {new Date(dep.dateDepense).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditDepense(dep)}
                              className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                              disabled={actioningId === dep.id}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user?.role === 'owner' && (
                              <button
                                onClick={() => handleDeleteDepense(dep.id)}
                                className="text-red-400 hover:text-red-300 transition-colors p-1"
                                disabled={actioningId === dep.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-700/50">
                  <tr className="font-bold">
                    <td colSpan="3" className="px-4 py-3 text-right text-white">TOTAL DÉPENSES:</td>
                    <td className="px-4 py-3 text-right text-orange-400">{formatFCFALong(totalDepenses)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-400">
            <p>Aucune dépense enregistrée</p>
          </div>
        )}
      </div>
    </div>
  )
}
