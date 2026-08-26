import React, { useState, useContext } from 'react'
import { X, Mail, User, Lock, Eye, EyeOff } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import { apiClient } from '../api/client'

export default function ProfileModal({ isOpen, onClose, user }) {
  const { logout } = useContext(AuthContext)
  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profil
  const [nom, setNom] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  // Mot de passe
  const [ancienMotDePasse, setAncienMotDePasse] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('')
  const [showPasswords, setShowPasswords] = useState({ ancien: false, nouveau: false, confirm: false })

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await apiClient.updateProfil(nom, email)
      setMessage('Profil mis à jour avec succès')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (nouveauMotDePasse !== confirmMotDePasse) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (nouveauMotDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      await apiClient.changerMotDePasse(ancienMotDePasse, nouveauMotDePasse)
      setMessage('Mot de passe changé avec succès')
      setAncienMotDePasse('')
      setNouveauMotDePasse('')
      setConfirmMotDePasse('')
      setTimeout(() => {
        setTab('profile')
      }, 1500)
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mon compte</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-3 px-4 font-medium text-center transition-colors ${
              tab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profil
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 py-3 px-4 font-medium text-center transition-colors ${
              tab === 'password'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Mot de passe
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="w-4 h-4 inline mr-2" />
                  Nom
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Mise à jour...' : 'Enregistrer les modifications'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ancien mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.ancien ? 'text' : 'password'}
                    value={ancienMotDePasse}
                    onChange={(e) => setAncienMotDePasse(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, ancien: !showPasswords.ancien })}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPasswords.ancien ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.nouveau ? 'text' : 'password'}
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, nouveau: !showPasswords.nouveau })}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPasswords.nouveau ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={confirmMotDePasse}
                    onChange={(e) => setConfirmMotDePasse(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Changement en cours...' : 'Changer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
