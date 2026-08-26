import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogOut, TrendingUp, AlertCircle } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'
import { apiClient } from '../api/client'
import SidebarSuperAdmin from '../components/SidebarSuperAdmin'

// Sections du dashboard
import ViewAnalytics from '../sections/SuperAdmin/ViewAnalytics'
import SuiviPaiements from '../sections/SuperAdmin/SuiviPaiements'
import ListeEleves from '../sections/SuperAdmin/ListeEleves'
import CreateEleve from '../sections/SuperAdmin/CreateEleve'
import PersonnelManagement from '../sections/SuperAdmin/PersonnelManagement'
import EcolesManagement from '../sections/SuperAdmin/EcolesManagement'
import ModuleDepenses from '../sections/SuperAdmin/ModuleDepenses'
import AnomaliesDetailed from '../sections/SuperAdmin/AnomaliesDetailed'
import Parametres from '../sections/SuperAdmin/Parametres'
import UsersManagement from './UsersManagement'

export default function DashboardSuperAdminEnhanced() {
  const { user, logout } = useContext(AuthContext)
  const [currentSection, setCurrentSection] = useState('dashboard')
  const [stats, setStats] = useState({
    totalEcoles: 0,
    totalEleves: 0,
    fraisCollectes: 0,
    anomalies: 0,
    personnels: 0
  })
  const [period, setPeriod] = useState('month') // jour, semaine, mois

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const ecolesRes = await fetch(`${API_ENDPOINTS.ecoles}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const ecoles = ecolesRes.ok ? await ecolesRes.json() : []

      const [eleves, personnel, frais] = await Promise.all([
        apiClient.getEleves().catch(() => []),
        apiClient.getPersonnel().catch(() => []),
        apiClient.getFrais().catch(() => [])
      ])

      const fraisCollectes = frais.reduce((sum, f) => sum + (f.montantPaye || 0), 0)

      setStats(prev => ({
        ...prev,
        totalEcoles: ecoles.length,
        totalEleves: eleves.length,
        personnels: personnel.length,
        fraisCollectes
      }))
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
  }

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardOverview stats={stats} period={period} setPeriod={setPeriod} />
      case 'view-analytics':
        return <ViewAnalytics />
      case 'paiements':
        return <SuiviPaiements />
      case 'list-eleves':
        return <ListeEleves />
      case 'create-eleve':
        return <CreateEleve />
      case 'list-personnel':
        return <PersonnelManagement section="list" />
      case 'create-personnel':
        return <PersonnelManagement section="create" />
      case 'list-ecoles':
        return <EcolesManagement section="list" />
      case 'create-ecole':
        return <EcolesManagement section="create" />
      case 'depenses':
        return <ModuleDepenses />
      case 'anomalies':
        return <AnomaliesDetailed />
      case 'parametres':
        return <Parametres />
      case 'comptes':
        return <UsersManagement />
      default:
        return <DashboardOverview stats={stats} period={period} setPeriod={setPeriod} />
    }
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <SidebarSuperAdmin
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
        logout={logout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">👑 Super Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Bienvenue, {user?.name}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Section Overview du Dashboard
function DashboardOverview({ stats, period, setPeriod }) {
  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod('jour')}
          className={`px-4 py-2 rounded-lg transition ${
            period === 'jour'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          Aujourd'hui
        </button>
        <button
          onClick={() => setPeriod('semaine')}
          className={`px-4 py-2 rounded-lg transition ${
            period === 'semaine'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cette semaine
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-lg transition ${
            period === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          Ce mois
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Écoles"
          value={stats.totalEcoles}
          icon="🏫"
          color="blue"
        />
        <StatCard
          title="Total élèves"
          value={stats.totalEleves || 0}
          icon="👥"
          color="green"
        />
        <StatCard
          title="Frais collectés"
          value={`${(stats.fraisCollectes / 1000000).toFixed(1)}M FCFA`}
          icon="💰"
          color="emerald"
        />
        <StatCard
          title="Anomalies"
          value={stats.anomalies || 0}
          icon="🚨"
          color="red"
        />
        <StatCard
          title="Personnels"
          value={stats.personnels || 0}
          icon="👔"
          color="purple"
        />
      </div>

      {/* Entrées/Sorties d'argent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entrées d'argent */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">Entrées d'argent</h2>
          </div>
          <div className="space-y-3">
            <FinanceRow label="Frais d'inscription" amount="1 200 000 FCFA" color="green" />
            <FinanceRow label="Frais de pension" amount="8 500 000 FCFA" color="green" />
            <FinanceRow label="Autres revenus" amount="500 000 FCFA" color="green" />
            <div className="border-t border-slate-200 pt-3 font-bold text-lg">
              <span>Total : </span>
              <span className="text-green-600">10 200 000 FCFA</span>
            </div>
          </div>
        </div>

        {/* Sorties d'argent */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">Sorties d'argent</h2>
          </div>
          <div className="space-y-3">
            <FinanceRow label="Salaires" amount="3 000 000 FCFA" color="red" />
            <FinanceRow label="Maintenance" amount="500 000 FCFA" color="red" />
            <FinanceRow label="Fournitures" amount="800 000 FCFA" color="red" />
            <FinanceRow label="Énergie/Eau" amount="400 000 FCFA" color="red" />
            <div className="border-t border-slate-200 pt-3 font-bold text-lg">
              <span>Total : </span>
              <span className="text-red-600">4 700 000 FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bénéfice/Perte */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 text-white">
        <h2 className="text-lg font-bold mb-2">Résultat net ({period})</h2>
        <p className="text-4xl font-bold">+5 500 000 FCFA</p>
        <p className="text-sm text-blue-100 mt-2">Entrées - Sorties</p>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    emerald: 'border-emerald-500 bg-emerald-50',
    red: 'border-red-500 bg-red-50',
    purple: 'border-purple-500 bg-purple-50'
  }

  const textClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  }

  return (
    <div className={`rounded-lg shadow-md p-4 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-xs font-medium">{title}</p>
          <p className={`text-2xl font-bold ${textClasses[color]}`}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function FinanceRow({ label, amount, color }) {
  const textColor = color === 'green' ? 'text-green-600' : 'text-red-600'
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-700">{label}</span>
      <span className={`font-semibold ${textColor}`}>{amount}</span>
    </div>
  )
}
