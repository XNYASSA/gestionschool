import React, { createContext, useState, useEffect } from 'react'
import { apiClient } from '../api/client.js'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger l'utilisateur au démarrage s'il y a un token
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const utilisateur = await apiClient.me()
          const mappedUser = {
            id: utilisateur.id,
            name: utilisateur.nom,
            email: utilisateur.email,
            role: mapRole(utilisateur.role),
            avatar: getAvatarByRole(utilisateur.role)
          }
          setUser(mappedUser)
        } catch (err) {
          console.error('Erreur chargement utilisateur:', err)
          localStorage.removeItem('token')
        }
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  const login = async (email, motDePasse, roleSelected = null) => {
    setError(null)
    setLoading(true)
    try {
      const utilisateur = await apiClient.login(email, motDePasse, roleSelected)
      // Mapper le rôle API vers le format frontend
      const mappedUser = {
        id: utilisateur.id,
        name: utilisateur.nom,
        email: utilisateur.email,
        role: mapRole(utilisateur.role),
        avatar: getAvatarByRole(utilisateur.role)
      }
      setUser(mappedUser)
      return mappedUser
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await apiClient.logout()
    } catch (err) {
      console.error('Erreur déconnexion:', err)
    }
    setUser(null)
    setLoading(false)
  }

  const mapRole = (apiRole) => {
    const roleMap = {
      'PROPRIETAIRE': 'owner',
      'DIRECTEUR': 'director',
      'SECRETAIRE': 'secretary',
      'ENSEIGNANT': 'teacher'
    }
    return roleMap[apiRole] || 'user'
  }

  const getAvatarByRole = (apiRole) => {
    const avatarMap = {
      'PROPRIETAIRE': '🔐',
      'DIRECTEUR': '👨‍💼',
      'SECRETAIRE': '👩‍💻',
      'ENSEIGNANT': '👩‍🏫'
    }
    return avatarMap[apiRole] || '👤'
  }

  const canAccess = (pageName) => {
    if (!user) return false

    const permissions = {
      owner: ['dashboard', 'students', 'fees', 'grades', 'attendance', 'staff', 'settings'],
      director: ['dashboard', 'students', 'fees', 'grades', 'attendance', 'staff'],
      secretary: ['dashboard', 'students', 'fees'],
      teacher: ['dashboard', 'grades', 'attendance']
    }

    return permissions[user.role]?.includes(pageName) || false
  }

  const getRoleColor = () => {
    if (!user) return 'from-gray-500 to-gray-600'
    const colorMap = {
      owner: 'from-purple-600 to-pink-600',
      director: 'from-blue-600 to-cyan-600',
      secretary: 'from-green-600 to-emerald-600',
      teacher: 'from-orange-600 to-red-600'
    }
    return colorMap[user.role] || 'from-gray-600 to-gray-700'
  }

  const getRoleBadge = () => {
    const roleLabels = {
      owner: '🔐 Admin',
      director: '👨‍💼 Directeur',
      secretary: '👩‍💻 Secrétaire',
      teacher: '👩‍🏫 Enseignant'
    }
    return roleLabels[user?.role] || 'Utilisateur'
  }

  const value = {
    user,
    login,
    logout,
    canAccess,
    getRoleColor,
    getRoleBadge,
    isLoggedIn: !!user,
    loading,
    error
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
