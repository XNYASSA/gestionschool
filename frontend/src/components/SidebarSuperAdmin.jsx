import { useState } from 'react'
import {
  Home, BarChart3, Users, School, Settings, FileText, AlertCircle, LogOut,
  ChevronDown, DollarSign, BookOpen, User, Eye, Menu, X
} from 'lucide-react'

export default function SidebarSuperAdmin({ currentSection, setCurrentSection, logout }) {
  const [expanded, setExpanded] = useState(true)
  const [openMenus, setOpenMenus] = useState({})

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }))
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: '📊 Tableau de bord',
      icon: Home,
      action: () => setCurrentSection('dashboard')
    },
    {
      id: 'analytics',
      label: '📈 Analytics',
      icon: BarChart3,
      submenu: [
        { id: 'paiements', label: 'Suivi des paiements' },
        { id: 'revenus', label: 'Revenus/Dépenses' }
      ]
    },
    {
      id: 'eleves',
      label: '👥 Élèves',
      icon: Users,
      submenu: [
        { id: 'list-eleves', label: 'Liste des élèves' },
        { id: 'paiement-status', label: 'Statuts de paiement' }
      ]
    },
    {
      id: 'personnel',
      label: '👔 Personnel',
      icon: User,
      submenu: [
        { id: 'list-personnel', label: 'Liste du personnel' },
        { id: 'create-personnel', label: 'Ajouter du personnel' },
        { id: 'comptes', label: 'Gestion des comptes' }
      ]
    },
    {
      id: 'ecoles',
      label: '🏫 Écoles',
      icon: School,
      submenu: [
        { id: 'list-ecoles', label: 'Liste des écoles' },
        { id: 'create-ecole', label: 'Créer une école' },
        { id: 'classes', label: 'Gestion des classes' }
      ]
    },
    {
      id: 'finances',
      label: '💰 Finances',
      icon: DollarSign,
      submenu: [
        { id: 'depenses', label: 'Module Dépenses' },
        { id: 'rapports-finance', label: 'Rapports financiers' },
        { id: 'configuration', label: 'Configuration frais' }
      ]
    },
    {
      id: 'pedagogie',
      label: '📚 Pédagogie',
      icon: BookOpen,
      submenu: [
        { id: 'cahier-textes', label: 'Cahier de textes' },
        { id: 'emploi-temps', label: 'Emploi du temps' },
        { id: 'bulletins', label: 'Bulletins' }
      ]
    },
    {
      id: 'anomalies',
      label: '🚨 Anomalies',
      icon: AlertCircle,
      action: () => setCurrentSection('anomalies')
    },
    {
      id: 'parametres',
      label: '⚙️ Paramètres',
      icon: Settings,
      action: () => setCurrentSection('parametres')
    }
  ]

  return (
    <div className={`${expanded ? 'w-64' : 'w-20'} bg-slate-900 text-white h-screen flex flex-col transition-all duration-300 shadow-lg`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {expanded && <h2 className="text-lg font-bold">👑 TDB Admin</h2>}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-slate-800 rounded transition"
        >
          {expanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {menuItems.map(item => (
          <div key={item.id}>
            {item.submenu ? (
              // Menu avec sous-éléments
              <div>
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                    expanded ? '' : 'justify-center'
                  } hover:bg-slate-800`}
                >
                  <item.icon className="w-5 h-5" />
                  {expanded && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          openMenus[item.id] ? 'rotate-180' : ''
                        }`}
                      />
                    </>
                  )}
                </button>

                {expanded && openMenus[item.id] && (
                  <div className="pl-6 space-y-1 mt-1">
                    {item.submenu.map(subitem => (
                      <button
                        key={subitem.id}
                        onClick={() => setCurrentSection(subitem.id)}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition ${
                          currentSection === subitem.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {subitem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Menu simple
              <button
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  currentSection === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                } ${expanded ? '' : 'justify-center'}`}
              >
                <item.icon className="w-5 h-5" />
                {expanded && <span>{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 transition ${
            expanded ? '' : 'justify-center'
          }`}
        >
          <LogOut className="w-5 h-5" />
          {expanded && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  )
}
