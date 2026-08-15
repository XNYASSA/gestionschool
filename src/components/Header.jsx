import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogOut, Filter } from 'lucide-react'

export default function Header({ onFilterChange, filters }) {
  const { user, logout } = useContext(AuthContext)

  if (!user) return null

  const getRoleColor = () => {
    const colors = {
      owner: 'from-purple-600 to-pink-600',
      director: 'from-blue-600 to-cyan-600',
      secretary: 'from-green-600 to-emerald-600',
      teacher: 'from-orange-600 to-red-600'
    }
    return colors[user.role] || 'from-gray-600 to-gray-700'
  }

  const getRoleLabel = () => {
    const labels = {
      owner: 'Admin',
      director: 'Directeur',
      secretary: 'Secrétaire',
      teacher: 'Enseignant'
    }
    return labels[user.role] || 'Utilisateur'
  }

  return (
    <header className={`bg-gradient-to-r ${getRoleColor()} shadow-lg`}>
      <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4">
        {/* Infos utilisateur à gauche */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="text-2xl md:text-3xl flex-shrink-0">{user.avatar}</div>
          <div className="hidden sm:block min-w-0">
            <p className="text-white/80 text-xs uppercase tracking-wider font-semibold">Connecté</p>
            <p className="text-white font-bold text-sm md:text-lg">{getRoleLabel()}</p>
            <p className="text-white/70 text-xs md:text-sm truncate">{user.name}</p>
          </div>
        </div>

        {/* Filtres au centre (si pertinent) - Hidden on mobile */}
        {onFilterChange && (
          <div className="hidden lg:flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/70 flex-shrink-0" />
            {filters?.section && (
              <select
                value={filters.section}
                onChange={(e) => onFilterChange({ ...filters, section: e.target.value })}
                className="px-2 py-1 bg-white/20 text-white rounded border border-white/30 text-xs font-medium hover:bg-white/30 transition-colors"
              >
                <option value="">Toutes les sections</option>
                <option value="francophone">Francophone</option>
                <option value="anglophone">Anglophone</option>
                <option value="technique">Technique</option>
              </select>
            )}
            {filters?.class && (
              <select
                value={filters.class || ''}
                onChange={(e) => onFilterChange({ ...filters, class: e.target.value })}
                className="px-2 py-1 bg-white/20 text-white rounded border border-white/30 text-xs font-medium hover:bg-white/30 transition-colors"
              >
                <option value="">Toutes les classes</option>
                {/* Classes seront populées dynamiquement */}
              </select>
            )}
          </div>
        )}

        {/* Bouton Changer de compte à droite */}
        <button
          onClick={logout}
          className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 font-medium text-xs md:text-sm flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Changer</span>
        </button>
      </div>
    </header>
  )
}
