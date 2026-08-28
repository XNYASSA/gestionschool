import { useState, useContext } from 'react'
import { AppProvider } from './context/AppContext'
import { AuthProvider, AuthContext } from './context/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LoginProfessional from './pages/LoginProfessional'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Fees from './pages/Fees'
import FeesEnhanced from './pages/FeesEnhanced'
import Grades from './pages/Grades'
import Attendance from './pages/Attendance'
import StaffFinance from './pages/StaffFinance'
import SettingsPage from './pages/Settings'

// Nouveaux dashboards Phase 2
import DashboardSuperAdminEnhanced from './pages/DashboardSuperAdminEnhanced'

import { Menu, X } from 'lucide-react'

// Rôles utilisant l'interface unifiée (sidebar + sections) de DashboardSuperAdminEnhanced
const ROLES_INTERFACE_UNIFIEE = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ECONOMAT', 'ENSEIGNANT', 'SURVEILLANT_GENERAL']

function AppContent() {
  const { isLoggedIn, user, isImpersonating, stopImpersonation } = useContext(AuthContext)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [filters, setFilters] = useState({ section: '', class: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isLoggedIn) {
    return <LoginProfessional />
  }

  const renderPage = () => {
    // Interface unifiée (sidebar + sections), identique pour tous les postes,
    // avec un menu filtré selon les fonctionnalités attribuées à chaque rôle.
    if (ROLES_INTERFACE_UNIFIEE.includes(user?.roleAPI)) {
      return <DashboardSuperAdminEnhanced />
    }

    // Dashboards existants (backward compatibility)
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard filters={filters} />
      case 'students':
        return <Students filters={filters} />
      case 'fees':
        return user?.role === 'owner' ? <FeesEnhanced filters={filters} /> : <Fees filters={filters} />
      case 'grades':
        return <Grades filters={filters} />
      case 'attendance':
        return <Attendance filters={filters} />
      case 'staff':
        return <StaffFinance filters={filters} />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard filters={filters} />
    }
  }

  // Les rôles de l'interface unifiée ont leur propre sidebar interne (DashboardSuperAdminEnhanced)
  const hasSidebar = !ROLES_INTERFACE_UNIFIEE.includes(user?.roleAPI) && ['owner', 'director'].includes(user?.role)

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
          <span>🔎 Connecté en tant que {user?.name} ({user?.email})</span>
          <button
            onClick={stopImpersonation}
            className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition"
          >
            Revenir à mon compte admin
          </button>
        </div>
      )}
      {/* Header avec burger menu */}
      <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700 px-4 py-2 md:hidden">
        {hasSidebar && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-gray-700 p-2 rounded transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}
        <span className="text-white font-semibold flex-1 text-center">École</span>
      </div>

      <Header filters={user?.role !== 'teacher' ? filters : null} onFilterChange={setFilters} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        {hasSidebar && (
          <div className="hidden md:flex md:w-64">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        )}

        {/* Sidebar Mobile (Drawer) */}
        {hasSidebar && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full w-64 z-50 md:hidden overflow-y-auto">
              <Sidebar currentPage={currentPage} setCurrentPage={(page) => {
                setCurrentPage(page)
                setSidebarOpen(false)
              }} />
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}
