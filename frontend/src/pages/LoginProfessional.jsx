import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogIn, Mail, Lock, User, Loader } from 'lucide-react'

const demoAccounts = [
  { email: 'michelmanga941@gmail.com', name: 'Michel Manga', role: 'Admin', emoji: '🔐', color: 'purple' },
  { email: 'yves@school.cm', name: 'M. Yves MBAKOP', role: 'Directeur', emoji: '👨‍💼', color: 'blue' },
  { email: 'marie@school.cm', name: 'Mme Marie AYISSI', role: 'Secrétaire', emoji: '👩‍💻', color: 'green' },
  { email: 'ines.math@school.cm', name: 'Mme Inès AYISSI', role: 'Prof. Math', emoji: '👩‍🏫', color: 'orange' },
  { email: 'benjamin.english@school.cm', name: 'Mr. Benjamin NCHANJI', role: 'Prof. English', emoji: '👨‍🏫', color: 'yellow' }
]

export default function LoginProfessional() {
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isAdmin = demoAccounts.find(a => a.email === email)?.role === 'Admin'

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs')
      return
    }

    // Vérifier que le rôle est sélectionné si nécessaire
    if (!isAdmin && !selectedRole) {
      setError('Veuillez sélectionner votre rôle')
      return
    }

    setLoading(true)
    setError('')
    try {
      await login(email, password, isAdmin ? null : selectedRole)
    } catch (err) {
      setError(err.message || 'Erreur de connexion. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail, demoRole) => {
    setLoading(true)
    setError('')
    try {
      // Mapper le rôle français au rôle API
      const roleMap = {
        'Admin': 'PROPRIETAIRE',
        'Directeur': 'DIRECTEUR',
        'Secrétaire': 'SECRETAIRE',
        'Prof. Math': 'ENSEIGNANT',
        'Prof. English': 'ENSEIGNANT'
      }
      await login(demoEmail, 'demo123', roleMap[demoRole])
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Colonne gauche - Formulaire */}
          <div className="flex flex-col justify-center">
            <div className="mb-8">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                TDB École
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Collège Rosa-Parks
              </h2>
              <p className="text-gray-400">Yaoundé, Cameroun</p>
            </div>

            <p className="text-gray-400 mb-8">
              Plateforme de gestion scolaire adaptée à votre rôle
            </p>

            {/* Formulaire de connexion */}
            <form onSubmit={handleLogin} className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedRole(null) // Réinitialiser le rôle quand on change l'email
                  }}
                  placeholder="ex. michelmanga941@gmail.com"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all disabled:opacity-50"
                />
              </div>

              {/* Sélection de rôle (sauf pour Admin) */}
              {email && !isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    👤 Sélectionner votre rôle
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT'].map(role => {
                      const roleLabel = {
                        DIRECTEUR: 'Directeur',
                        SECRETAIRE: 'Secrétaire',
                        ENSEIGNANT: 'Enseignant'
                      }[role]
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            selectedRole === role
                              ? 'bg-blue-600 text-white border-2 border-blue-400'
                              : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:bg-gray-600'
                          } disabled:opacity-50`}
                        >
                          {roleLabel}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-sm text-gray-500">
              Connectez-vous avec un compte de démo (voir à droite)
            </div>
          </div>

          {/* Colonne droite - Comptes de démo */}
          <div>
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-6 mb-8">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <User className="w-5 h-5" />
                Comptes de Démonstration
              </h3>
              <p className="text-gray-300 text-sm">
                Cliquez sur un profil pour vous connecter instantanément
              </p>
            </div>

            <div className="space-y-4">
              {demoAccounts.map((account, idx) => {
                const colorMap = {
                  purple: { border: 'border-purple-500/50 hover:border-purple-500', text: 'group-hover:text-purple-400' },
                  blue: { border: 'border-blue-500/50 hover:border-blue-500', text: 'group-hover:text-blue-400' },
                  green: { border: 'border-green-500/50 hover:border-green-500', text: 'group-hover:text-green-400' },
                  orange: { border: 'border-orange-500/50 hover:border-orange-500', text: 'group-hover:text-orange-400' },
                  yellow: { border: 'border-yellow-500/50 hover:border-yellow-500', text: 'group-hover:text-yellow-400' }
                }
                const color = colorMap[account.color] || colorMap.blue

                return (
                  <button
                    key={account.email}
                    onClick={() => handleDemoLogin(account.email, account.role)}
                    disabled={loading}
                    className={`w-full group bg-gray-800 hover:bg-gray-700 border-2 ${color.border} rounded-lg p-4 text-left transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{account.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-white ${color.text}`}>
                          {account.role}
                        </p>
                        <p className="text-sm text-gray-400">{account.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{account.email}</p>
                      </div>
                      <LogIn className={`w-5 h-5 text-gray-500 ${color.text} flex-shrink-0 mt-1`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
