import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogIn, Mail, Lock, Loader } from 'lucide-react'

const DEMO_PROFILES = [
  { email: 'admin@gestionschool.cm', password: 'password123', nom: 'Xavier Nyassa', role: 'SUPER_ADMIN', emoji: '👑' },
  { email: 'principal1@gestionschool.cm', password: 'password123', nom: 'Dr. Jean Dupont', role: 'PRINCIPAL', emoji: '👨‍💼' },
  { email: 'principal2@gestionschool.cm', password: 'password123', nom: 'Dr. Marie Durand', role: 'PRINCIPAL', emoji: '👨‍💼' },
  { email: 'directrice1@gestionschool.cm', password: 'password123', nom: 'Mme Amélie Bernard', role: 'DIRECTRICE', emoji: '👩‍💼' },
  { email: 'directrice2@gestionschool.cm', password: 'password123', nom: 'Mme Sophie Lebrun', role: 'DIRECTRICE', emoji: '👩‍💼' },
  { email: 'secretaire@gestionschool.cm', password: 'password123', nom: 'Alice Martin', role: 'SECRETAIRE', emoji: '👩‍💻' },
  { email: 'enseignant@gestionschool.cm', password: 'password123', nom: 'Prof. Michel Leclerc', role: 'ENSEIGNANT', emoji: '👩‍🏫' },
  { email: 'economat@gestionschool.cm', password: 'password123', nom: 'Pierre Economiste', role: 'ECONOMAT', emoji: '💰' }
]

export default function LoginProfessional() {
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuickLogin = async (profile) => {
    setEmail(profile.email)
    setPassword(profile.password)
    setError('')
    setLoading(true)

    try {
      await login(profile.email, profile.password)
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir l\'email et le mot de passe')
      return
    }

    setLoading(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Erreur de connexion. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col justify-center">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
              TDB École
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Gestion Scolaire Multi-Établissements
            </h2>
            <p className="text-gray-400">Yaoundé, Cameroun</p>
          </div>

          {/* Formulaire de connexion */}
          <form onSubmit={handleLogin} className="space-y-6 bg-gray-800/50 border border-gray-700 rounded-xl p-8">
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
                  setError('')
                }}
                placeholder="Entrez votre email"
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
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                ⚠️ {error}
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

          {/* Info message */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-gray-300 text-sm text-center">
              💡 Saisissez vos identifiants pour accéder au système
            </p>
          </div>

          {/* Demo Profiles */}
          <div className="mt-12">
            <h3 className="text-gray-300 font-semibold mb-4 text-center">
              🎯 Accès rapide - Comptes de démo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DEMO_PROFILES.map((profile, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickLogin(profile)}
                  disabled={loading}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 hover:border-blue-500 rounded-lg transition-all duration-200 disabled:opacity-50 group"
                >
                  <div className="text-2xl mb-1">{profile.emoji}</div>
                  <div className="text-xs font-medium text-gray-300 group-hover:text-blue-300 transition-colors mb-1">
                    {profile.nom.split(' ')[0]}
                  </div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400">
                    {profile.role === 'SUPER_ADMIN' ? 'Admin' :
                     profile.role === 'PRINCIPAL' ? 'Principal' :
                     profile.role === 'DIRECTRICE' ? 'Directrice' :
                     profile.role === 'SECRETAIRE' ? 'Secrétaire' :
                     profile.role === 'ENSEIGNANT' ? 'Enseignant' :
                     profile.role === 'ECONOMAT' ? 'Économat' : profile.role}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs text-center mt-4">
              Mot de passe: password123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
