import { useState, useEffect, useContext } from 'react'
import { Plus, Edit2, Trash2, X, Loader, Power, Phone, Wallet } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthContext } from '../../context/AuthContext'

const ROLES = [
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'DIRECTRICE', label: 'Directrice' },
  { value: 'SECRETAIRE', label: 'Secrétaire' },
  { value: 'ENSEIGNANT', label: 'Enseignant(e)' },
  { value: 'ECONOMAT', label: 'Économat' },
  { value: 'SURVEILLANT_GENERAL', label: 'Surveillant Général' },
  { value: 'PERSONNEL', label: 'Autre personnel administratif' }
]

const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

const FONCTIONS_SUGGESTIONS = [
  'Enseignante', 'Enseignant', 'Secrétaire', 'Économat', 'Surveillant Général',
  'Censeur', 'Secrétaire Général', 'Intendant', 'Principal', 'Directrice'
]

const emptyForm = {
  nom: '',
  email: '',
  motDePasse: '',
  role: 'ENSEIGNANT',
  fonction: '',
  telephone: '',
  salaireMensuel: '',
  tarifHoraire: '',
  ecoleIds: []
}

export default function PersonnelManagement({ section, canGererComptes = true }) {
  const { user } = useContext(AuthContext)
  const rolesDisponibles = canGererComptes ? ROLES : ROLES.filter(r => !['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE'].includes(r.value))
  const [personnel, setPersonnel] = useState([])
  const [ecoles, setEcoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (section === 'create') {
      openCreateModal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [utilisateurs, ecolesData] = await Promise.all([
        apiClient.getUtilisateurs(),
        apiClient.getEcoles()
      ])
      // Exclure les comptes Super Admin de la gestion du personnel
      setPersonnel(utilisateurs.filter(u => u.role !== 'SUPER_ADMIN'))
      setEcoles(ecolesData)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du personnel')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEditModal = (p) => {
    setFormData({
      nom: p.nom,
      email: p.email,
      motDePasse: '',
      role: p.role,
      fonction: p.fonction || '',
      telephone: p.telephone || '',
      salaireMensuel: p.salaireMensuel || '',
      tarifHoraire: p.enseignant?.tarifHoraire || '',
      ecoleIds: p.utilisateurEcoles?.map(ue => ue.ecole.id) || []
    })
    setEditingId(p.id)
    setShowModal(true)
  }

  const toggleEcole = (ecoleId) => {
    setFormData(prev => ({
      ...prev,
      ecoleIds: prev.ecoleIds.includes(ecoleId)
        ? prev.ecoleIds.filter(id => id !== ecoleId)
        : [...prev.ecoleIds, ecoleId]
    }))
  }

  const handleSave = async () => {
    if (!formData.nom || !formData.role || (!editingId && (!formData.email || !formData.motDePasse))) {
      alert('Veuillez remplir les champs obligatoires (nom, rôle, email et mot de passe pour une création)')
      return
    }

    try {
      let utilisateurId = editingId

      if (editingId) {
        const { email, ecoleIds, tarifHoraire, ...updateData } = formData
        if (!updateData.motDePasse) delete updateData.motDePasse
        await apiClient.updateUtilisateur(editingId, updateData)
      } else {
        const { ecoleIds, tarifHoraire, ...createData } = formData
        const nouveau = await apiClient.createUtilisateur(createData)
        utilisateurId = nouveau.id
      }

      // Synchroniser les écoles affectées (ajouts + retraits) selon le poste confié
      const ecolesAvant = editingId ? (personnel.find(p => p.id === editingId)?.utilisateurEcoles?.map(ue => ue.ecole.id) || []) : []
      const aRetirer = ecolesAvant.filter(id => !formData.ecoleIds.includes(id))

      await Promise.all([
        ...formData.ecoleIds.map(ecoleId => apiClient.assignEcoleToUtilisateur(utilisateurId, ecoleId, formData.role)),
        ...aRetirer.map(ecoleId => apiClient.removeEcoleFromUtilisateur(utilisateurId, ecoleId))
      ])

      if (formData.role === 'ENSEIGNANT') {
        await apiClient.updateTarifHoraire(utilisateurId, formData.tarifHoraire || null)
      }

      setShowModal(false)
      loadData()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleToggleStatut = async (p) => {
    const action = p.actif ? 'suspendre (bloquer son accès à l\'application)' : 'réactiver l\'accès de'
    if (!confirm(`Voulez-vous ${action} ${p.nom} ?`)) return
    try {
      await apiClient.toggleUtilisateurStatut(p.id)
      loadData()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDelete = async (p) => {
    if (p.id === user?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte')
      return
    }
    if (!confirm(`Supprimer définitivement ${p.nom} ? Cette action est irréversible.`)) return
    try {
      await apiClient.deleteUtilisateur(p.id)
      setPersonnel(personnel.filter(pers => pers.id !== p.id))
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message)
    }
  }

  const formatFCFA = (m) => m ? `${m.toLocaleString('fr-FR')} FCFA` : '-'

  const masseSalariale = personnel
    .filter(p => p.actif)
    .reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">👔 Gestion du personnel</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Ajouter un membre
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Personnel ({personnel.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader className="w-5 h-5 animate-spin" /> Chargement...
          </div>
        ) : personnel.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun membre du personnel</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Fonction</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">École</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Contact</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Salaire</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Statut</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {personnel.map(p => (
                  <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{p.nom}</td>
                    <td className="px-6 py-3 text-slate-600">
                      <span className="font-medium">{p.fonction || ROLE_LABELS[p.role] || p.role}</span>
                      <span className="block text-xs text-slate-400">{ROLE_LABELS[p.role] || p.role}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {p.utilisateurEcoles?.map(ue => ue.ecole.nomCourt).join(', ') || '-'}
                    </td>
                    <td className="px-6 py-3 text-slate-600 text-xs">
                      <div>{p.email}</div>
                      {p.telephone && (
                        <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.telephone}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center font-mono text-slate-700">
                      <div className="flex items-center justify-center gap-1">
                        <Wallet className="w-3 h-3 text-slate-400" /> {formatFCFA(p.salaireMensuel)}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        p.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.actif ? '✓ Actif' : '✗ Suspendu'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 hover:bg-yellow-100 rounded text-yellow-600 transition"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {canGererComptes && (
                          <>
                            <button
                              onClick={() => handleToggleStatut(p)}
                              className={`p-2 rounded transition ${p.actif ? 'hover:bg-orange-100 text-orange-600' : 'hover:bg-green-100 text-green-600'}`}
                              title={p.actif ? 'Suspendre (bloquer l\'accès)' : 'Réactiver l\'accès'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-2 hover:bg-red-100 rounded text-red-600 transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && personnel.length > 0 && (
          <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-500" />
            <p className="font-bold text-slate-900">
              Masse salariale totale (personnel actif) : <span className="text-blue-600">{formatFCFA(masseSalariale)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? '✎ Modifier le membre' : '➕ Ajouter un membre du personnel'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    list="fonctions-list"
                    value={formData.fonction}
                    onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                    placeholder="ex: Censeur"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <datalist id="fonctions-list">
                    {FONCTIONS_SUGGESTIONS.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email {!editingId && '*'}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>

              {(canGererComptes || !editingId) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mot de passe {!editingId ? '*' : '(laisser vide pour ne pas changer)'}
                  </label>
                  <input
                    type="password"
                    value={formData.motDePasse}
                    onChange={(e) => setFormData({ ...formData, motDePasse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle / poste confié *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {rolesDisponibles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {formData.role === 'ENSEIGNANT' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tarif horaire (FCFA/heure)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.tarifHoraire}
                    onChange={(e) => setFormData({ ...formData, tarifHoraire: e.target.value })}
                    placeholder="Laisser vide si payé au salaire mensuel"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Utilisé pour calculer automatiquement les heures faites dans le rapport financier.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  École(s) affectée(s) pour ce poste
                </label>
                <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {ecoles.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Aucune école disponible</p>
                  ) : (
                    ecoles.map(e => (
                      <label key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.ecoleIds.includes(e.id)}
                          onChange={() => toggleEcole(e.id)}
                          className="w-4 h-4"
                        />
                        {e.nomCourt}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cochez une ou plusieurs écoles si cette personne exerce ce poste sur plusieurs établissements.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="+237 6 XX XXX XXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire mensuel (FCFA)</label>
                  <input
                    type="number"
                    value={formData.salaireMensuel}
                    onChange={(e) => setFormData({ ...formData, salaireMensuel: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-slate-200">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Enregistrer' : 'Créer'}
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
