import { useState, useContext } from 'react'
import { UserCircle, KeyRound, School } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthContext } from '../../context/AuthContext'

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  PRINCIPAL: 'Principal',
  DIRECTRICE: 'Directrice',
  SECRETAIRE: 'Secrétaire',
  ENSEIGNANT: 'Enseignant(e)',
  ECONOMAT: 'Économat',
  SURVEILLANT_GENERAL: 'Surveillant Général',
  PERSONNEL: 'Personnel administratif'
}

export default function Parametres() {
  const { user, ecoles, refreshUser } = useContext(AuthContext)

  const [profil, setProfil] = useState({ nom: user?.name || '', email: user?.email || '' })
  const [profilMsg, setProfilMsg] = useState('')
  const [profilErr, setProfilErr] = useState('')
  const [savingProfil, setSavingProfil] = useState(false)

  const [motDePasse, setMotDePasse] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const [mdpMsg, setMdpMsg] = useState('')
  const [mdpErr, setMdpErr] = useState('')
  const [savingMdp, setSavingMdp] = useState(false)

  const handleSaveProfil = async (e) => {
    e.preventDefault()
    setProfilMsg('')
    setProfilErr('')
    setSavingProfil(true)
    try {
      await apiClient.updateProfil(profil.nom, profil.email)
      await refreshUser()
      setProfilMsg('Informations du compte mises à jour avec succès.')
    } catch (err) {
      setProfilErr(err.message || 'Erreur lors de la mise à jour du profil')
    } finally {
      setSavingProfil(false)
    }
  }

  const handleChangerMotDePasse = async (e) => {
    e.preventDefault()
    setMdpMsg('')
    setMdpErr('')

    if (motDePasse.nouveau !== motDePasse.confirmation) {
      setMdpErr('Le nouveau mot de passe et sa confirmation ne correspondent pas.')
      return
    }
    if (motDePasse.nouveau.length < 6) {
      setMdpErr('Le nouveau mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setSavingMdp(true)
    try {
      await apiClient.changerMotDePasse(motDePasse.ancien, motDePasse.nouveau)
      setMotDePasse({ ancien: '', nouveau: '', confirmation: '' })
      setMdpMsg('Mot de passe modifié avec succès.')
    } catch (err) {
      setMdpErr(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setSavingMdp(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900">⚙️ Paramètres du compte</h2>

      {/* Informations du compte */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Informations du compte</h3>
        </div>

        {profilMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">✓ {profilMsg}</div>}
        {profilErr && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">⚠️ {profilErr}</div>}

        <form onSubmit={handleSaveProfil} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
            <input
              type="text"
              value={profil.nom}
              onChange={(e) => setProfil({ ...profil, nom: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={profil.email}
              onChange={(e) => setProfil({ ...profil, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
            <input
              type="text"
              value={ROLE_LABELS[user?.roleAPI] || user?.roleAPI || ''}
              disabled
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500"
            />
            <p className="text-xs text-slate-500 mt-1">Le rôle ne peut être modifié que par un administrateur.</p>
          </div>
          <button
            type="submit"
            disabled={savingProfil}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {savingProfil ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Écoles affectées (lecture seule) */}
      {ecoles && ecoles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-3">
            <School className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Établissement(s) affecté(s)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {ecoles.map(e => (
              <span key={e.id} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                {e.nomCourt}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Seul un administrateur peut modifier vos affectations.</p>
        </div>
      )}

      {/* Sécurité / mot de passe */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-bold text-slate-900">Changer le mot de passe</h3>
        </div>

        {mdpMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">✓ {mdpMsg}</div>}
        {mdpErr && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">⚠️ {mdpErr}</div>}

        <form onSubmit={handleChangerMotDePasse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={motDePasse.ancien}
              onChange={(e) => setMotDePasse({ ...motDePasse, ancien: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={motDePasse.nouveau}
              onChange={(e) => setMotDePasse({ ...motDePasse, nouveau: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={motDePasse.confirmation}
              onChange={(e) => setMotDePasse({ ...motDePasse, confirmation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingMdp}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
          >
            {savingMdp ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
