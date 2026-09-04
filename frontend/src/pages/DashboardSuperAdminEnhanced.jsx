import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogOut, TrendingUp, AlertCircle, Menu } from 'lucide-react'
import { apiClient } from '../api/client'
import { isInPeriod, PERIOD_LABELS } from '../utils/periodFilter'
import SidebarSuperAdmin, { MENU_PAR_ROLE } from '../components/SidebarSuperAdmin'

// Sections du dashboard
import ViewAnalytics from '../sections/SuperAdmin/ViewAnalytics'
import SuiviPaiements from '../sections/SuperAdmin/SuiviPaiements'
import ListeEleves from '../sections/SuperAdmin/ListeEleves'
import PersonnelManagement from '../sections/SuperAdmin/PersonnelManagement'
import EcolesManagement from '../sections/SuperAdmin/EcolesManagement'
import ModuleDepenses from '../sections/SuperAdmin/ModuleDepenses'
import RapportsFinanciers from '../sections/SuperAdmin/RapportsFinanciers'
import RapportFinancierForm from '../sections/SuperAdmin/RapportFinancierForm'
import RapportFinancierSecretaire from '../sections/SuperAdmin/RapportFinancierSecretaire'
import ConfigurationFrais from '../sections/SuperAdmin/ConfigurationFrais'
import AnomaliesDetailed from '../sections/SuperAdmin/AnomaliesDetailed'
import AffectationsEnseignants from '../sections/SuperAdmin/AffectationsEnseignants'
import CahierTextes from '../sections/SuperAdmin/CahierTextes'
import EmploiTemps from '../sections/SuperAdmin/EmploiTemps'
import Bulletins from '../sections/SuperAdmin/Bulletins'
import Parametres from '../sections/SuperAdmin/Parametres'
import UsersManagement from './UsersManagement'
import PersonnelRH from '../components/PersonnelRH'
import SaisieFraisSecretaire from '../sections/SuperAdmin/SaisieFraisSecretaire'
import ReceptionsEtablies from '../sections/SuperAdmin/ReceptionsEtablies'
import VerificationFinanciere from '../sections/SuperAdmin/VerificationFinanciere'
import MesClasses from '../sections/SuperAdmin/MesClasses'
import CahierTexteEnseignant from '../sections/SuperAdmin/CahierTexteEnseignant'
import SaisieNotesEnseignant from '../sections/SuperAdmin/SaisieNotesEnseignant'
import AppelPresence from '../sections/SuperAdmin/AppelPresence'
import ConsultationPresences from '../sections/SuperAdmin/ConsultationPresences'

const TITRES_PAR_ROLE = {
  SUPER_ADMIN: { sidebar: '👑 TDB Admin', header: '👑 Super Admin Dashboard' },
  PRINCIPAL: { sidebar: '👨‍💼 Espace Direction', header: '👨‍💼 Tableau de bord — Principal' },
  DIRECTRICE: { sidebar: '👩‍💼 Espace Direction', header: '👩‍💼 Tableau de bord — Directrice' },
  SECRETAIRE: { sidebar: '👩‍💻 Espace Secrétariat', header: '👩‍💻 Tableau de bord — Secrétaire' },
  ECONOMAT: { sidebar: '💰 Espace Économat', header: '💰 Tableau de bord — Économat' },
  ENSEIGNANT: { sidebar: '👨‍🏫 Espace Enseignant', header: '👨‍🏫 Tableau de bord — Enseignant' },
  SURVEILLANT_GENERAL: { sidebar: '🚔 Espace Surveillance', header: '🚔 Tableau de bord — Surveillant Général' }
}

export default function DashboardSuperAdminEnhanced() {
  const { user, logout, ecoles } = useContext(AuthContext)
  const isSuperAdmin = user?.roleAPI === 'SUPER_ADMIN'
  const allowedIds = isSuperAdmin ? null : (MENU_PAR_ROLE[user?.roleAPI] || [])
  const ecoleIds = isSuperAdmin ? undefined : (ecoles || []).map(e => e.id)
  const titres = TITRES_PAR_ROLE[user?.roleAPI] || TITRES_PAR_ROLE.SUPER_ADMIN

  const [currentSection, setCurrentSection] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState({
    totalEcoles: 0,
    totalEleves: 0,
    personnels: 0,
    anomalies: 0
  })
  const [frais, setFrais] = useState([])
  const [depenses, setDepenses] = useState([])
  const [personnelActif, setPersonnelActif] = useState([])
  const [period, setPeriod] = useState('mois') // jour, semaine, mois

  useEffect(() => {
    loadStats()
  }, [])

  // Le bouton retour du navigateur doit revenir à la section précédente de
  // l'application (et non quitter l'app), tant qu'il reste des sections visitées.
  useEffect(() => {
    window.history.replaceState({ section: 'dashboard' }, '')
    const onPopState = (e) => {
      setCurrentSection(e.state?.section || 'dashboard')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigateToSection = (section) => {
    setCurrentSection(section)
    window.history.pushState({ section }, '')
  }

  const loadStats = async () => {
    try {
      const [ecoles, eleves, fraisData, depensesData, anomalies, utilisateurs] = await Promise.all([
        apiClient.getEcoles().catch(() => []),
        apiClient.getEleves().catch(() => []),
        apiClient.getFrais().catch(() => []),
        apiClient.getDepenses().catch(() => []),
        apiClient.getAnomalies().catch(() => []),
        apiClient.getUtilisateurs().catch(() => [])
      ])

      setFrais(fraisData)
      setDepenses(depensesData)
      setPersonnelActif(utilisateurs.filter(u => u.actif && u.salaireMensuel))

      setStats({
        totalEcoles: ecoles.length,
        totalEleves: eleves.length,
        // Même source que Personnel → Liste du personnel (comptes Utilisateur, hors Super Admin)
        personnels: utilisateurs.filter(u => u.role !== 'SUPER_ADMIN').length,
        anomalies: anomalies.filter(a => !a.resolue).length
      })
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
  }

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardOverview stats={stats} frais={frais} depenses={depenses} personnelActif={personnelActif} period={period} setPeriod={setPeriod} showAnomalies={isSuperAdmin} showFinances={user?.roleAPI !== 'ENSEIGNANT'} />
      case 'revenus':
        return <ViewAnalytics />
      case 'paiements':
      case 'paiement-status':
        return <SuiviPaiements />
      case 'list-eleves':
        return <ListeEleves ecoleIds={ecoleIds} showStatutPaiement={user?.roleAPI !== 'ENSEIGNANT'} />
      case 'list-personnel':
        return <PersonnelManagement section="list" ecoleIds={ecoleIds} canGererComptes={isSuperAdmin} />
      case 'create-personnel':
        return <PersonnelManagement section="create" ecoleIds={ecoleIds} canGererComptes={isSuperAdmin} />
      case 'list-ecoles':
        return <EcolesManagement section="list" ecoleIds={ecoleIds} />
      case 'create-ecole':
        return <EcolesManagement section="create" ecoleIds={ecoleIds} />
      case 'classes':
        return <EcolesManagement section="classes" ecoleIds={ecoleIds} />
      case 'depenses':
        return <ModuleDepenses ecoleIds={ecoleIds} />
      case 'rapports-finance':
        return isSuperAdmin
          ? <RapportsFinanciers />
          : user?.roleAPI === 'SECRETAIRE'
            ? <RapportFinancierSecretaire />
            : <RapportFinancierForm ecoleIds={ecoleIds} />
      case 'configuration':
        return <ConfigurationFrais ecoleIds={ecoleIds} />
      case 'affectations-enseignants':
        return <AffectationsEnseignants />
      case 'cahier-textes':
        return <CahierTextes ecoleIds={ecoleIds} />
      case 'emploi-temps':
        return <EmploiTemps ecoleIds={ecoleIds} />
      case 'bulletins':
        return <Bulletins ecoleIds={ecoleIds} />
      case 'saisie-horaires':
        return <PersonnelRH vue="horaires" />
      case 'saisie-presences':
        return <PersonnelRH vue="presences" />
      case 'saisie-frais-secretaire':
        return <SaisieFraisSecretaire />
      case 'receptions-etablies':
        return <ReceptionsEtablies />
      case 'verification-financiere':
        return <VerificationFinanciere />
      case 'mes-classes':
        return <MesClasses />
      case 'cahier-texte-enseignant':
        return <CahierTexteEnseignant />
      case 'saisie-notes':
        return <SaisieNotesEnseignant />
      case 'appel-presence':
        return <AppelPresence />
      case 'presences-eleves':
        return <ConsultationPresences />
      case 'anomalies':
        return <AnomaliesDetailed />
      case 'parametres':
        return <Parametres />
      case 'comptes':
        return <UsersManagement />
      default:
        return <DashboardOverview stats={stats} frais={frais} depenses={depenses} personnelActif={personnelActif} period={period} setPeriod={setPeriod} showAnomalies={isSuperAdmin} showFinances={user?.roleAPI !== 'ENSEIGNANT'} />
    }
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex">
        <SidebarSuperAdmin
          currentSection={currentSection}
          setCurrentSection={navigateToSection}
          logout={logout}
          allowedIds={allowedIds}
          titre={titres.sidebar}
        />
      </div>

      {/* Sidebar Mobile (tiroir) */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full z-50 md:hidden">
            <SidebarSuperAdmin
              currentSection={currentSection}
              setCurrentSection={(section) => { navigateToSection(section); setMobileMenuOpen(false) }}
              logout={logout}
              allowedIds={allowedIds}
              titre={titres.sidebar}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{titres.header}</h1>
              <p className="text-xs md:text-sm text-slate-500 truncate">Bienvenue, {user?.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-3 md:px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2 flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Section Overview du Dashboard
function DashboardOverview({ stats, frais = [], depenses = [], personnelActif = [], period, setPeriod, showAnomalies = true, showFinances = true }) {
  const formatFCFA = (m) => `${m.toLocaleString('fr-FR')} FCFA`

  const fraisPeriode = frais.filter(f => f.montantPaye > 0 && isInPeriod(f.datePayement || f.createdAt, period))
  const inscriptions = fraisPeriode.filter(f => f.tranche === 'inscription').reduce((sum, f) => sum + f.montantPaye, 0)
  const pensions = fraisPeriode.filter(f => f.tranche !== 'inscription').reduce((sum, f) => sum + f.montantPaye, 0)
  const totalEntrees = inscriptions + pensions

  // Salaires : montant mensuel actuel du personnel actif, indépendant de la période
  const totalSalaires = personnelActif.reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)

  const depensesPeriode = depenses.filter(d => isInPeriod(d.dateDepense, period))
  const totalFixes = depensesPeriode.filter(d => d.type === 'FIXE').reduce((sum, d) => sum + d.montant, 0)
  const totalVariables = depensesPeriode.filter(d => d.type === 'VARIABLE').reduce((sum, d) => sum + d.montant, 0)
  const totalSorties = totalSalaires + totalFixes + totalVariables

  const resultatNet = totalEntrees - totalSorties

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="flex gap-2">
        {['jour', 'semaine', 'mois'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg transition ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 gap-4 ${showAnomalies && showFinances ? 'md:grid-cols-4' : showAnomalies || showFinances ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
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
        {showAnomalies && (
          <StatCard
            title="Anomalies non résolues"
            value={stats.anomalies || 0}
            icon="🚨"
            color="red"
          />
        )}
        {showFinances && (
          <StatCard
            title="Personnels"
            value={stats.personnels || 0}
            icon="👔"
            color="purple"
          />
        )}
      </div>

      {showFinances && (
        <>
          {/* Entrées/Sorties d'argent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entrées d'argent */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-slate-900">Entrées d'argent</h2>
              </div>
              <div className="space-y-3">
                <FinanceRow label="Frais d'inscription" amount={formatFCFA(inscriptions)} color="green" />
                <FinanceRow label="Frais de pension" amount={formatFCFA(pensions)} color="green" />
                <div className="border-t border-slate-200 pt-3 font-bold text-lg">
                  <span>Total : </span>
                  <span className="text-green-600">{formatFCFA(totalEntrees)}</span>
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
                <FinanceRow label="Salaires (personnel actif)" amount={formatFCFA(totalSalaires)} color="red" />
                <FinanceRow label="Autres charges fixes" amount={formatFCFA(totalFixes)} color="red" />
                <FinanceRow label="Charges variables (matériel...)" amount={formatFCFA(totalVariables)} color="red" />
                <div className="border-t border-slate-200 pt-3 font-bold text-lg">
                  <span>Total : </span>
                  <span className="text-red-600">{formatFCFA(totalSorties)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bénéfice/Perte */}
          <div className={`rounded-lg shadow-md p-6 text-white bg-gradient-to-r ${
            resultatNet >= 0 ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'
          }`}>
            <h2 className="text-lg font-bold mb-2">Résultat net ({PERIOD_LABELS[period]})</h2>
            <p className="text-2xl md:text-4xl font-bold break-words">{resultatNet >= 0 ? '+' : ''}{formatFCFA(resultatNet)}</p>
            <p className="text-sm text-white/80 mt-2">Entrées - Sorties</p>
          </div>
        </>
      )}
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
