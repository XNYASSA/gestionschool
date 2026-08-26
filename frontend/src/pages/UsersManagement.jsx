import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { apiClient } from '../api/client'
import { Users, Loader, AlertCircle } from 'lucide-react'

const roleLabels = {
  SUPER_ADMIN: '👑 Super Admin',
  PRINCIPAL: '👨‍💼 Principal',
  DIRECTRICE: '👩‍💼 Directrice',
  SECRETAIRE: '👩‍💻 Secrétaire',
  ENSEIGNANT: '👩‍🏫 Enseignant',
  ECONOMAT: '💰 Économat',
  SURVEILLANT_GENERAL: '🚔 Surveillant'
}

const roleBgColors = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  PRINCIPAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DIRECTRICE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  SECRETAIRE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ENSEIGNANT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  ECONOMAT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  SURVEILLANT_GENERAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

export default function UsersManagement() {
  const { user } = useContext(AuthContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getUtilisateurs()
      setUsers(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  if (user?.roleAPI !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mb-3" />
        <h2 className="text-lg font-bold text-red-900 dark:text-red-300 mb-1">Accès refusé</h2>
        <p className="text-red-700 dark:text-red-400">
          Seul le Super Admin peut accéder à cette page.
        </p>
      </div>
    )
  }

  const filteredUsers = users.filter(u =>
    u.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Gestion des comptes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {users.length} utilisateur{users.length > 1 ? 's' : ''} actif{users.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Rechercher par nom, email ou rôle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <Loader className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {u.nom}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${roleBgColors[u.role] || 'bg-gray-100 text-gray-800'}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          u.actif
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {u.actif ? '✓ Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
