import React, { useContext, useState } from 'react'
import { LayoutDashboard, Users, DollarSign, BookOpen, ClipboardList, Building2, Settings, LogOut, ChevronDown } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import { schoolData } from '../data/mockData'

export default function Sidebar({ currentPage, setCurrentPage }) {
  const { user, logout, canAccess } = useContext(AuthContext)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: LayoutDashboard,
      color: 'text-blue-500'
    },
    {
      id: 'students',
      label: 'Élèves',
      icon: Users,
      color: 'text-purple-500'
    },
    {
      id: 'grades',
      label: 'Notes & Bulletins',
      icon: BookOpen,
      color: 'text-orange-500'
    },
    {
      id: 'attendance',
      label: 'Présences',
      icon: ClipboardList,
      color: 'text-red-500'
    },
    {
      id: 'staff',
      label: 'Personnel & Finances',
      icon: Building2,
      color: 'text-indigo-500'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      color: 'text-cyan-500'
    }
  ]

  const getRoleColor = () => {
    const colors = {
      owner: 'from-purple-600 to-pink-600',
      director: 'from-blue-600 to-cyan-600',
      secretary: 'from-green-600 to-emerald-600',
      teacher: 'from-orange-600 to-red-600'
    }
    return colors[user?.role] || 'from-gray-600 to-gray-700'
  }

  const getRoleLabel = () => {
    const labels = {
      owner: 'Admin',
      director: 'Directeur',
      secretary: 'Secrétaire',
      teacher: 'Enseignant'
    }
    return labels[user?.role] || 'Utilisateur'
  }

  return (
    <aside className={`w-64 bg-gray-800 text-white flex flex-col relative`}>
      {/* Header avec gradient du rôle */}
      <div className={`bg-gradient-to-r ${getRoleColor()} p-6 border-b border-gray-700`}>
        <div className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-2">
          {getRoleLabel()}
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">TDB École</h1>
        <p className="text-sm text-white/70">Gestion Scolaire</p>
      </div>

      {/* Infos utilisateur */}
      <div className="px-4 py-4 border-b border-gray-700">
        <div className={`bg-gradient-to-br ${getRoleColor()} rounded-lg p-3 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{user?.avatar}</span>
            <span className="text-xs font-bold px-2 py-1 bg-white/20 rounded-full">
              {getRoleLabel()}
            </span>
          </div>
          <p className="font-bold text-sm">{user?.name}</p>
          <p className="text-xs text-white/70 mt-1">{user?.title}</p>

          {/* Classes si enseignant */}
          {user?.classes && (
            <div className="mt-3 pt-2 border-t border-white/20 text-xs">
              <p className="text-white/70 mb-1">Classes:</p>
              <div className="space-y-1">
                {user.classes.map((cls, idx) => (
                  <span key={idx} className="inline-block px-2 py-0.5 bg-white/20 rounded text-xs mr-1 mb-1">
                    {cls}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          const hasAccess = canAccess(item.id)

          if (!hasAccess) {
            return (
              <div
                key={item.id}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg opacity-40 cursor-not-allowed"
              >
                <Icon className="w-5 h-5 flex-shrink-0 text-gray-500" />
                <span className="font-medium text-sm text-gray-500">{item.label}</span>
                <span className="ml-auto text-xs text-gray-600 font-bold">🔒</span>
              </div>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer - Changement de profil */}
      <div className="p-4 border-t border-gray-700 space-y-4">
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-200 text-sm"
          >
            <span>Changer de profil</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              <p className="px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Se connecter comme:</p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  logout()
                  setShowProfileMenu(false)
                }}
                className="block w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors text-gray-200 border-t border-gray-600 font-semibold"
              >
                Retour à l'écran de connexion
              </a>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Déconnexion</span>
        </button>
      </div>

      {/* Watermark école */}
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        <p>{schoolData.name}</p>
        <p className="text-gray-600">{schoolData.location}</p>
      </div>
    </aside>
  )
}
