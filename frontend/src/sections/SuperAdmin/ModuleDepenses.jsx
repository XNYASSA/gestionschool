import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Loader } from 'lucide-react'
import { apiClient } from '../../api/client'
import { isInPeriod } from '../../utils/periodFilter'

const CATEGORIES = ['MATERIEL', 'FOURNITURES', 'MAINTENANCE', 'ENERGIE', 'AUTRE']

const emptyForm = {
  description: '',
  categorie: 'AUTRE',
  type: 'VARIABLE',
  montant: '',
  dateDepense: new Date().toISOString().split('T')[0],
  ecoleId: ''
}

export default function ModuleDepenses() {
  const [depenses, setDepenses] = useState([])
  const [ecoles, setEcoles] = useState([])
  const [personnel, setPersonnel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('mois')
  const [filterEcole, setFilterEcole] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [depensesData, ecolesData, utilisateursData] = await Promise.all([
        apiClient.getDepenses(),
        apiClient.getEcoles(),
        apiClient.getUtilisateurs()
      ])
      setDepenses(depensesData)
      setEcoles(ecolesData)
      setPersonnel(utilisateursData.filter(u => u.actif && u.salaireMensuel))
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des dépenses')
    } finally {
      setLoading(false)
    }
  }

  // Salaires : calculés en direct depuis le personnel actif (source de vérité = Personnel),
  // pas depuis une dépense saisie manuellement — toujours le montant mensuel actuel
  const personnelFiltre = useMemo(() => {
    if (!filterEcole) return personnel
    return personnel.filter(p => p.utilisateurEcoles?.some(ue => ue.ecole.id === filterEcole))
  }, [personnel, filterEcole])
  const totalSalaires = personnelFiltre.reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)

  const filtered = useMemo(() => {
    return depenses.filter(d => {
      if (!isInPeriod(d.dateDepense, period)) return false
      if (filterEcole && d.ecoleId !== filterEcole) return false
      return true
    })
  }, [depenses, period, filterEcole])

  const fixes = filtered.filter(d => d.type === 'FIXE')
  const variables = filtered.filter(d => d.type === 'VARIABLE')
  const totalFixes = fixes.reduce((sum, d) => sum + d.montant, 0)
  const totalVariables = variables.reduce((sum, d) => sum + d.montant, 0)
  const totalGeneral = totalSalaires + totalFixes + totalVariables

  const openCreateModal = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEditModal = (depense) => {
    setFormData({
      description: depense.description,
      categorie: depense.categorie,
      type: depense.type,
      montant: depense.montant,
      dateDepense: new Date(depense.dateDepense).toISOString().split('T')[0],
      ecoleId: depense.ecoleId || ''
    })
    setEditingId(depense.id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.description || !formData.montant) {
      alert('Veuillez remplir la description et le montant')
      return
    }

    try {
      const payload = { ...formData, montant: parseInt(formData.montant), ecoleId: formData.ecoleId || null }
      if (editingId) {
        await apiClient.updateDepense(editingId, payload)
      } else {
        await apiClient.createDepense(payload)
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    try {
      await apiClient.deleteDepense(id)
      setDepenses(depenses.filter(d => d.id !== id))
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message)
    }
  }

  const formatFCFA = (m) => `${m.toLocaleString('fr-FR')} FCFA`

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">💳 Module Dépenses</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouvelle dépense
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {['jour', 'semaine', 'mois'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition capitalize ${
                period === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p === 'jour' ? "Aujourd'hui" : p === 'semaine' ? 'Cette semaine' : 'Ce mois'}
            </button>
          ))}
        </div>
        <select
          value={filterEcole}
          onChange={(e) => setFilterEcole(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">Toutes les écoles</option>
          {ecoles.map(e => (
            <option key={e.id} value={e.id}>{e.nomCourt}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      ) : (
        <>
          {/* Salaires : calculés en direct depuis Personnel, non modifiables ici */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">💼 Salaires du personnel actif ({personnelFiltre.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Montant mensuel actuel — à modifier depuis Personnel → Liste du personnel</p>
            </div>
            {personnelFiltre.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Aucun membre du personnel rémunéré</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Fonction</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">École</th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700">Salaire mensuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnelFiltre.map(p => (
                      <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-900">{p.nom}</td>
                        <td className="px-6 py-3 text-slate-600">{p.fonction || p.role}</td>
                        <td className="px-6 py-3 text-slate-600">{p.utilisateurEcoles?.map(ue => ue.ecole.nomCourt).join(', ') || '-'}</td>
                        <td className="px-6 py-3 text-center font-mono font-semibold text-red-600">{formatFCFA(p.salaireMensuel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <p className="font-bold text-slate-900">Total salaires : <span className="text-red-600">{formatFCFA(totalSalaires)}</span></p>
            </div>
          </div>

          {/* Autres charges fixes (loyer, assurance, etc.) */}
          <DepenseTable
            title="🔒 Autres charges fixes (loyer, assurances...)"
            depenses={fixes}
            total={totalFixes}
            onEdit={openEditModal}
            onDelete={handleDelete}
            formatFCFA={formatFCFA}
          />

          {/* Charges variables */}
          <DepenseTable
            title="📦 Charges variables (matériel, achats ponctuels)"
            depenses={variables}
            total={totalVariables}
            onEdit={openEditModal}
            onDelete={handleDelete}
            formatFCFA={formatFCFA}
          />

          {/* Total général */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-lg font-bold mb-1">Total des dépenses (salaires + charges fixes + charges variables sur {period})</h3>
            <p className="text-3xl font-bold">{formatFCFA(totalGeneral)}</p>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? '✎ Modifier la dépense' : '➕ Nouvelle dépense'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="FIXE">Autre charge fixe (loyer, assurance...)</option>
                    <option value="VARIABLE">Charge variable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA) *</label>
                  <input
                    type="number"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.dateDepense}
                    onChange={(e) => setFormData({ ...formData, dateDepense: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">École concernée</label>
                <select
                  value={formData.ecoleId}
                  onChange={(e) => setFormData({ ...formData, ecoleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Toutes / Non spécifiée</option>
                  {ecoles.map(e => (
                    <option key={e.id} value={e.id}>{e.nomCourt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-slate-200">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Modifier' : 'Créer'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DepenseTable({ title, depenses, total, onEdit, onDelete, formatFCFA }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h3 className="font-bold text-slate-900">{title} ({depenses.length})</h3>
      </div>
      {depenses.length === 0 ? (
        <div className="p-6 text-center text-slate-500">Aucune dépense sur cette période</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Description</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Catégorie</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">École</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Date</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {depenses.map(d => (
                <tr key={d.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-900">{d.description}</td>
                  <td className="px-6 py-3 text-slate-600">{d.categorie}</td>
                  <td className="px-6 py-3 text-slate-600">{d.ecole?.nomCourt || '-'}</td>
                  <td className="px-6 py-3 text-slate-600">{new Date(d.dateDepense).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-3 text-center font-mono font-semibold text-red-600">{formatFCFA(d.montant)}</td>
                  <td className="px-6 py-3 text-center flex gap-2 justify-center">
                    <button onClick={() => onEdit(d)} className="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(d.id)} className="p-1 hover:bg-red-100 rounded text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
        <p className="font-bold text-slate-900">Total : <span className="text-red-600">{formatFCFA(total)}</span></p>
      </div>
    </div>
  )
}
