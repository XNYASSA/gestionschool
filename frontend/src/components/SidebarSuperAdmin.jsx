import { useState } from 'react'
import {
  Home, BarChart3, Users, School, Settings, FileText, AlertCircle, LogOut,
  ChevronDown, DollarSign, BookOpen, User, Eye, Menu, X, Clock, GraduationCap
} from 'lucide-react'

// Fonctionnalités attribuées à chaque poste — null = accès complet (Super Admin).
// Un id présent ici doit correspondre à un id de menuItems/submenu ci-dessous.
const RH_SAISIE = ['saisie-horaires', 'saisie-presences']

export const MENU_PAR_ROLE = {
  PRINCIPAL: ['dashboard', 'list-eleves', 'list-personnel', 'create-personnel', 'list-ecoles', 'create-ecole', 'classes', 'depenses', 'rapports-finance', 'configuration', 'affectations-enseignants', 'cahier-textes', 'emploi-temps', 'bulletins', ...RH_SAISIE, 'parametres'],
  DIRECTRICE: ['dashboard', 'list-eleves', 'list-personnel', 'create-personnel', 'list-ecoles', 'create-ecole', 'classes', 'depenses', 'rapports-finance', 'configuration', 'affectations-enseignants', 'cahier-textes', 'emploi-temps', 'bulletins', ...RH_SAISIE, 'parametres'],
  SECRETAIRE: ['dashboard', 'list-eleves', 'list-personnel', 'create-personnel', 'list-ecoles', 'rapports-finance', 'affectations-enseignants', 'bulletins', ...RH_SAISIE, 'parametres'],
  ECONOMAT: ['dashboard', 'list-eleves', 'list-ecoles', 'verification-financiere', 'parametres'],
  ENSEIGNANT: ['dashboard', 'list-eleves', 'mes-classes', 'cahier-texte-enseignant', 'saisie-notes', 'appel-presence', 'parametres'],
  SURVEILLANT_GENERAL: ['dashboard', 'presences-eleves', ...RH_SAISIE, 'parametres']
}

export default function SidebarSuperAdmin({ currentSection, setCurrentSection, logout, allowedIds = null, titre = '👑 TDB Admin' }) {
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
        { id: 'paiement-status', label: 'Statuts de paiement' },
        { id: 'presences-eleves', label: 'Présences des élèves' }
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
        { id: 'configuration', label: 'Configuration frais' },
        { id: 'verification-financiere', label: 'Vérification Financière' }
      ]
    },
    {
      id: 'pedagogie',
      label: '📚 Pédagogie',
      icon: BookOpen,
      submenu: [
        { id: 'affectations-enseignants', label: 'Affectations enseignants' },
        { id: 'cahier-textes', label: 'Cahier de textes' },
        { id: 'emploi-temps', label: 'Emploi du temps' },
        { id: 'bulletins', label: 'Bulletins' }
      ]
    },
    {
      id: 'rh-personnel',
      label: '🕐 Ressources Humaines',
      icon: Clock,
      submenu: [
        { id: 'saisie-horaires', label: 'Emploi du temps' },
        { id: 'saisie-presences', label: 'Présences' }
      ]
    },
    {
      id: 'secretariat',
      label: '📋 Secrétariat',
      icon: FileText,
      submenu: [
        { id: 'saisie-frais-secretaire', label: 'Saisie Frais' },
        { id: 'receptions-etablies', label: 'Réceptions établies' }
      ]
    },
    {
      id: 'enseignement',
      label: '🎓 Enseignement',
      icon: GraduationCap,
      submenu: [
        { id: 'mes-classes', label: 'Mes classes' },
        { id: 'cahier-texte-enseignant', label: 'Cahier de texte' },
        { id: 'saisie-notes', label: 'Saisie de notes' },
        { id: 'appel-presence', label: 'Appel' }
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

  // Filtre le menu selon les fonctionnalités attribuées au poste (allowedIds = null → accès complet)
  const menuItemsVisibles = allowedIds === null
    ? menuItems
    : menuItems
        .map(item => item.submenu
          ? { ...item, submenu: item.submenu.filter(sub => allowedIds.includes(sub.id)) }
          : item
        )
        .filter(item => allowedIds.includes(item.id) || (item.submenu && item.submenu.length > 0))

  return (
    <div className={`${expanded ? 'w-64' : 'w-20'} bg-slate-900 text-white h-screen flex flex-col transition-all duration-300 shadow-lg`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {expanded && <h2 className="text-lg font-bold">{titre}</h2>}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-slate-800 rounded transition"
        >
          {expanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {menuItemsVisibles.map(item => (
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
