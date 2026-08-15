import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Lock, Unlock, Loader, AlertCircle, Save, X } from 'lucide-react'
import { apiClient } from '../api/client'

const ROLES = [
  { value: 'PROPRIETAIRE', label: '🏛️ Admin (Propriétaire)' },
  { value: 'DIRECTEUR', label: '👨‍💼 Directeur' },
  { value: 'SECRETAIRE', label: '👩‍💻 Secrétaire' },
  { value: 'ENSEIGNANT', label: '👩‍🏫 Enseignant' }
]

export default function UserManagement() {
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [actioningId, setActioningId] = useState(null)

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    role: 'ENSEIGNANT'
  })

  useEffect(() => {
    loadUtilisateurs()
  }, [])

  const loadUtilisateurs = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getUtilisateurs()
      setUtilisateurs(data || [])
    } catch (err) {
      setError('Erreur chargement utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.nom || !formData.email || !formData.role) {
        setError('Champs obligatoires manquants')
        return
      }

      if (!editingId && !formData.motDePasse) {
        setError('Le mot de passe est obligatoire pour un nouveau compte')
        return
      }

      const dataToSend = {
        nom: formData.nom,
        role: formData.role
      }

      if (formData.motDePasse) {
        dataToSend.motDePasse = formData.motDePasse
      }

      if (editingId) {
        await apiClient.updateUtilisateur(editingId, dataToSend)
      } else {
        dataToSend.email = formData.email
        await apiClient.createUtilisateur(
          formData.nom,
          formData.email,
          formData.motDePasse,
          formData.role
        )
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ nom: '', email: '', motDePasse: '', role: 'ENSEIGNANT' })
      await loadUtilisateurs()
      setError(null)
    } catch (err) {
      setError(err.message || 'Erreur sauvegarde')
    }
  }

  const handleEdit = (user) => {
    setEditingId(user.id)
    setFormData({
      nom: user.nom,
      email: user.email,
      motDePasse: '',
      role: user.role
    })
    setShowForm(true)
  }

  const handleToggleStatut = async (id) => {
    setActioningId(id)
    try {
      await apiClient.toggleUtilisateurStatut(id)
      await loadUtilisateurs()
    } catch (err) {
      setError('Erreur changement statut')
    } finally {
      setActioningId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) return
    setActioningId(id)
    try {
      await apiClient.deleteUtilisateur(id)
      await loadUtilisateurs()
    } catch (err) {
      setError('Erreur suppression')
    } finally {
      setActioningId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-white">👥 Gestion des Utilisateurs</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({ nom: '', email: '', motDePasse: '', role: 'ENSEIGNANT' })
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvel utilisateur
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? '✏️ Modifier un utilisateur' : '➕ Créer un nouvel utilisateur'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom complet *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleFormChange}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email {editingId ? '' : '*'}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="jean@ecole.cm"
                  disabled={editingId}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  required={!editingId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mot de passe {editingId ? '(optionnel pour modification)' : '*'}
                </label>
                <input
                  type="password"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleFormChange}
                  placeholder={editingId ? 'Laisser vide pour garder le mot de passe' : 'Mot de passe'}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required={!editingId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Rôle *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4 inline mr-1" />
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

      {/* Tableau utilisateurs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700 border-b border-gray-600">
                <th className="px-6 py-3 text-left font-semibold text-white">Nom</th>
                <th className="px-6 py-3 text-left font-semibold text-white">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-white">Rôle</th>
                <th className="px-6 py-3 text-left font-semibold text-white">Statut</th>
                <th className="px-6 py-3 text-center font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {utilisateurs.map((user) => {
                const roleLabel = ROLES.find(r => r.value === user.role)?.label || user.role
                return (
                  <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-300">{user.nom}</td>
                    <td className="px-6 py-4 text-gray-400">{user.email}</td>
                    <td className="px-6 py-4 text-gray-400">{roleLabel}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        user.actif
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {user.actif ? '✓ Actif' : '✕ Suspendu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          disabled={actioningId === user.id}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatut(user.id)}
                          className={`transition-colors p-1 ${
                            user.actif ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                          }`}
                          disabled={actioningId === user.id}
                          title={user.actif ? 'Suspendre' : 'Activer'}
                        >
                          {user.actif ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                          disabled={actioningId === user.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {utilisateurs.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>Aucun utilisateur enregistré</p>
        </div>
      )}
    </div>
  )
}
