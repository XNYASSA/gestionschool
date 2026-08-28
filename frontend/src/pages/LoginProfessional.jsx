import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogIn, Mail, Lock, Loader } from 'lucide-react'

export default function LoginProfessional() {
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        </div>
      </div>
    </div>
  )
}
