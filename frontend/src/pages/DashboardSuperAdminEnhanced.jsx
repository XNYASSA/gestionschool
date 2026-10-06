import { useContext, useState, useEffect, lazy, Suspense } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogOut, TrendingUp, AlertCircle, Menu, Search, ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, Wallet } from 'lucide-react'
import { apiClient } from '../api/client'
import { isInPeriod, bornesPeriode, decalerPeriode, libellePeriode } from '../utils/periodFilter'
import { formatFCFA } from '../utils/formatters'
import SidebarSuperAdmin, { MENU_PAR_ROLE } from '../components/SidebarSuperAdmin'

// Sections du dashboard
const ViewAnalytics = lazy(() => import('../sections/SuperAdmin/ViewAnalytics'))
const SuiviPaiements = lazy(() => import('../sections/SuperAdmin/SuiviPaiements'))
const ListeEleves = lazy(() => import('../sections/SuperAdmin/ListeEleves'))
const PersonnelManagement = lazy(() => import('../sections/SuperAdmin/PersonnelManagement'))
const EcolesManagement = lazy(() => import('../sections/SuperAdmin/EcolesManagement'))
const ModuleDepenses = lazy(() => import('../sections/SuperAdmin/ModuleDepenses'))
const RapportsFinanciers = lazy(() => import('../sections/SuperAdmin/RapportsFinanciers'))
const RapportFinancierForm = lazy(() => import('../sections/SuperAdmin/RapportFinancierForm'))
const RapportFinancierSecretaire = lazy(() => import('../sections/SuperAdmin/RapportFinancierSecretaire'))
const ConfigurationFrais = lazy(() => import('../sections/SuperAdmin/ConfigurationFrais'))
const AnomaliesDetailed = lazy(() => import('../sections/SuperAdmin/AnomaliesDetailed'))
const AffectationsEnseignants = lazy(() => import('../sections/SuperAdmin/AffectationsEnseignants'))
const CahierTextes = lazy(() => import('../sections/SuperAdmin/CahierTextes'))
const EmploiTemps = lazy(() => import('../sections/SuperAdmin/EmploiTemps'))
const Bulletins = lazy(() => import('../sections/SuperAdmin/Bulletins'))
import { calculerSignalements } from '../utils/signalements'
const ValidationNotes = lazy(() => import('../sections/SuperAdmin/ValidationNotes'))
const BordereauNotes = lazy(() => import('../sections/SuperAdmin/BordereauNotes'))
const BaremeNotation = lazy(() => import('../sections/SuperAdmin/BaremeNotation'))
const Parametres = lazy(() => import('../sections/SuperAdmin/Parametres'))
const UsersManagement = lazy(() => import('./UsersManagement'))
const PersonnelRH = lazy(() => import('../components/PersonnelRH'))
const SaisieFraisSecretaire = lazy(() => import('../sections/SuperAdmin/SaisieFraisSecretaire'))
const ReceptionsEtablies = lazy(() => import('../sections/SuperAdmin/ReceptionsEtablies'))
const VerificationFinanciere = lazy(() => import('../sections/SuperAdmin/VerificationFinanciere'))
const MesClasses = lazy(() => import('../sections/SuperAdmin/MesClasses'))
const CahierTexteEnseignant = lazy(() => import('../sections/SuperAdmin/CahierTexteEnseignant'))
const SaisieNotesEnseignant = lazy(() => import('../sections/SuperAdmin/SaisieNotesEnseignant'))
const AppelPresence = lazy(() => import('../sections/SuperAdmin/AppelPresence'))
const GestionPresences = lazy(() => import('../sections/SuperAdmin/GestionPresences'))
const ConsultationPresences = lazy(() => import('../sections/SuperAdmin/ConsultationPresences'))
const ImporterEleves = lazy(() => import('../sections/SuperAdmin/ImporterEleves'))
const FraisParEcole = lazy(() => import('../sections/SuperAdmin/FraisParEcole'))
const Matieres = lazy(() => import('../sections/SuperAdmin/Matieres'))

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
    elevesIncomplets: 0,
    personnels: 0,
    anomalies: 0
  })
  const [frais, setFrais] = useState([])
  const [depenses, setDepenses] = useState([])
  const [personnelActif, setPersonnelActif] = useState([])
  const [period, setPeriod] = useState('mois') // jour, semaine, mois
  const [eleveSearchQuery, setEleveSearchQuery] = useState('')
  const [cameFromDashboard, setCameFromDashboard] = useState(false)
  const [filtreIncomplets, setFiltreIncomplets] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  // Le bouton retour du navigateur doit revenir à la section précédente de
  // l'application (et non quitter l'app), tant qu'il reste des sections visitées.
  useEffect(() => {
    window.history.replaceState({ section: 'dashboard', fromDashboard: false }, '')
    const onPopState = (e) => {
      setCurrentSection(e.state?.section || 'dashboard')
      setCameFromDashboard(!!e.state?.fromDashboard)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // fromDashboard=true affiche une flèche "Retour à l'accueil" dans la section
  // ouverte, pour les écrans atteints en cliquant une carte du tableau de bord.
  const navigateToSection = (section, fromDashboard = false) => {
    setCurrentSection(section)
    setCameFromDashboard(fromDashboard)
    setFiltreIncomplets(false)
    window.history.pushState({ section, fromDashboard }, '')
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
        elevesIncomplets: calculerSignalements(eleves).size,
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
        return <DashboardOverview stats={stats} frais={frais} depenses={depenses} personnelActif={personnelActif} period={period} setPeriod={setPeriod} showAnomalies={isSuperAdmin} showFinances={user?.roleAPI !== 'ENSEIGNANT'} onNavigate={navigateToSection} onVoirIncomplets={() => { navigateToSection('list-eleves', true); setFiltreIncomplets(true) }} onRechercherEleve={(terme) => { setEleveSearchQuery(terme); navigateToSection('list-eleves', true) }} />
      case 'revenus':
        return <ViewAnalytics onNavigate={navigateToSection} />
      case 'paiements':
      case 'paiement-status':
        return <SuiviPaiements />
      case 'list-eleves':
        return <ListeEleves ecoleIds={ecoleIds} showStatutPaiement={user?.roleAPI !== 'ENSEIGNANT'} initialSearch={eleveSearchQuery} initialIncomplets={filtreIncomplets} />
      case 'frais-par-ecole':
        return <FraisParEcole />
      case 'import-eleves':
        return <ImporterEleves onNavigate={navigateToSection} />
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
          ? <RapportsFinanciers onNavigate={navigateToSection} />
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
        return <Bulletins ecoleIds={ecoleIds} onNavigate={navigateToSection} />
      case 'bordereau-notes':
        return <BordereauNotes onNavigate={navigateToSection} />
      case 'validation-notes':
        return <ValidationNotes />
      case 'bareme-notation':
        return <BaremeNotation />
      case 'matieres':
        return <Matieres />
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
      case 'gestion-presences':
        return <GestionPresences />
      case 'presences-eleves':
        return <ConsultationPresences />
      case 'anomalies':
        return <AnomaliesDetailed />
      case 'parametres':
        return <Parametres />
      case 'comptes':
        return <UsersManagement />
      default:
        return <DashboardOverview stats={stats} frais={frais} depenses={depenses} personnelActif={personnelActif} period={period} setPeriod={setPeriod} showAnomalies={isSuperAdmin} showFinances={user?.roleAPI !== 'ENSEIGNANT'} onNavigate={navigateToSection} onVoirIncomplets={() => { navigateToSection('list-eleves', true); setFiltreIncomplets(true) }} onRechercherEleve={(terme) => { setEleveSearchQuery(terme); navigateToSection('list-eleves', true) }} />
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
            {cameFromDashboard && currentSection !== 'dashboard' && (
              <button
                onClick={() => navigateToSection('dashboard')}
                className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
              </button>
            )}
            <Suspense fallback={<div className="p-8 text-center text-slate-400">Chargement...</div>}>
              {renderSection()}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

// Section Overview du Dashboard
function DashboardOverview({ stats, frais = [], depenses = [], personnelActif = [], period, setPeriod, showAnomalies = true, showFinances = true, onNavigate, onRechercherEleve, onVoirIncomplets }) {
  const [rechercheEleve, setRechercheEleve] = useState('')

  const handleRecherche = (e) => {
    e.preventDefault()
    if (rechercheEleve.trim()) onRechercherEleve?.(rechercheEleve.trim())
  }

  // Jour de référence du filtre (aujourd'hui par défaut) : la période affichée est le jour, la
  // semaine (lundi → dimanche) ou le mois qui le contient.
  const [dateRef, setDateRef] = useState(() => new Date())
  const { debut: debutPeriode } = bornesPeriode(period, dateRef)
  const periodeFuture = bornesPeriode(period, decalerPeriode(period, dateRef, 1)).debut > new Date()
  const estPeriodeCourante = isInPeriod(new Date(), period, dateRef)
  const libelle = libellePeriode(period, dateRef)
  const versIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const aujourdhuiIso = versIso(new Date())

  const fraisPeriode = frais.filter(f => f.montantPaye > 0 && isInPeriod(f.datePayement || f.createdAt, period, dateRef))
  const inscriptions = fraisPeriode.filter(f => !/^tranche\d+$/.test(f.tranche)).reduce((sum, f) => sum + f.montantPaye, 0)
  const pensions = fraisPeriode.filter(f => /^tranche\d+$/.test(f.tranche)).reduce((sum, f) => sum + f.montantPaye, 0)
  const totalEntrees = inscriptions + pensions

  // Salaires : montant mensuel actuel du personnel actif, indépendant de la période
  const totalSalaires = personnelActif.reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)

  const depensesPeriode = depenses.filter(d => isInPeriod(d.dateDepense, period, dateRef))
  const totalFixes = depensesPeriode.filter(d => d.type === 'FIXE').reduce((sum, d) => sum + d.montant, 0)
  const totalVariables = depensesPeriode.filter(d => d.type === 'VARIABLE').reduce((sum, d) => sum + d.montant, 0)
  const totalSorties = totalSalaires + totalFixes + totalVariables

  const resultatNet = totalEntrees - totalSorties

  // Situation globale, indépendante du filtre : ce qui a été perçu depuis le début, et la dette
  // actuelle des élèves inscrits (dû - déjà payé), toutes échéances confondues.
  const totalPercu = frais.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
  const totalAttendu = frais.reduce((sum, f) => sum + (f.montantDu || 0), 0)
  const resteAPercevoir = frais.reduce((sum, f) => sum + Math.max(0, f.montantDu - f.montantPaye), 0)
  const tauxRecouvrement = totalAttendu > 0 ? Math.min(100, Math.round((totalPercu / totalAttendu) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Situation globale en temps réel (non filtrée) */}
      {showFinances && (
        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" /> Situation globale des frais
            </h2>
            <span className="text-xs text-slate-500">En temps réel, toutes périodes confondues — élèves actuellement inscrits</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4">
              <p className="text-sm text-slate-600">Total perçu</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-700 break-words">{formatFCFA(totalPercu)}</p>
            </div>
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
              <p className="text-sm text-slate-600">Reste à percevoir</p>
              <p className="text-xl md:text-2xl font-bold text-amber-700 break-words">{formatFCFA(resteAPercevoir)}</p>
            </div>
            <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
              <p className="text-sm text-slate-600">Total attendu</p>
              <p className="text-xl md:text-2xl font-bold text-blue-700 break-words">{formatFCFA(totalAttendu)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Taux de recouvrement</span>
              <span className="font-semibold">{tauxRecouvrement} %</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${tauxRecouvrement}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Filtre de période : jour / semaine / mois + date choisie */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            {[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois']].map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium transition ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDateRef(decalerPeriode(period, dateRef, -1))}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100"
              title="Période précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {period === 'mois' ? (
              <input
                type="month"
                value={versIso(debutPeriode).slice(0, 7)}
                max={aujourdhuiIso.slice(0, 7)}
                onChange={(e) => e.target.value && setDateRef(new Date(`${e.target.value}-01T12:00:00`))}
                className="px-3 py-2 border border-slate-300 rounded-lg"
              />
            ) : (
              <input
                type="date"
                value={versIso(dateRef)}
                max={aujourdhuiIso}
                onChange={(e) => e.target.value && setDateRef(new Date(`${e.target.value}T12:00:00`))}
                className="px-3 py-2 border border-slate-300 rounded-lg"
              />
            )}
            <button
              onClick={() => setDateRef(decalerPeriode(period, dateRef, 1))}
              disabled={periodeFuture}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Période suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!estPeriodeCourante && (
            <button
              onClick={() => setDateRef(new Date())}
              className="px-3 py-2 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Revenir à aujourd'hui
            </button>
          )}
        </div>
        <p className="text-sm text-slate-700 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          Période affichée : <strong>{libelle}</strong>
          {period === 'semaine' && <span className="text-xs text-slate-500">(semaine du lundi au dimanche)</span>}
        </p>
      </div>

      {/* Recherche rapide d'un élève par nom */}
      {onRechercherEleve && (
        <form onSubmit={handleRecherche} className="bg-white rounded-lg shadow-md p-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={rechercheEleve}
              onChange={(e) => setRechercheEleve(e.target.value)}
              placeholder="Rechercher un élève par nom..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Rechercher
          </button>
        </form>
      )}

      {showFinances && stats.elevesIncomplets > 0 && onVoirIncomplets && (
        <button
          onClick={onVoirIncomplets}
          className="w-full text-left bg-red-50 border border-red-300 rounded-lg p-4 text-red-800 text-sm hover:bg-red-100 transition"
        >
          ⚠ <strong>{stats.elevesIncomplets} élève{stats.elevesIncomplets > 1 ? 's' : ''}</strong> {stats.elevesIncomplets > 1 ? 'ont' : 'a'} des signalements (informations manquantes ou incohérences : parent, téléphone, doublon, trop-perçu…). Cliquez pour voir le problème et ce qu'il faut faire.
        </button>
      )}

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 gap-4 ${showAnomalies && showFinances ? 'md:grid-cols-4' : showAnomalies || showFinances ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <StatCard
          title="Écoles"
          value={stats.totalEcoles}
          icon="🏫"
          color="blue"
          onClick={onNavigate && (() => onNavigate('list-ecoles', true))}
        />
        <StatCard
          title="Total élèves"
          value={stats.totalEleves || 0}
          icon="👥"
          color="green"
          onClick={onNavigate && (() => onNavigate('classes', true))}
        />
        {showAnomalies && (
          <StatCard
            title="Anomalies non résolues"
            value={stats.anomalies || 0}
            icon="🚨"
            color="red"
            onClick={onNavigate && (() => onNavigate('anomalies', true))}
          />
        )}
        {showFinances && (
          <StatCard
            title="Personnels"
            value={stats.personnels || 0}
            icon="👔"
            color="purple"
            onClick={onNavigate && (() => onNavigate('list-personnel', true))}
          />
        )}
      </div>

      {showFinances && (
        <>
          {/* Entrées/Sorties d'argent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entrées d'argent */}
            <div
              onClick={onNavigate && (() => onNavigate('frais-par-ecole', true))}
              className={`bg-white rounded-lg shadow-md p-6 ${onNavigate ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition' : ''}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-slate-900">Sommes collectées sur la période</h2>
              </div>
              <div className="space-y-3">
                <FinanceRow label="Frais d'inscription" amount={formatFCFA(inscriptions)} color="green" />
                <FinanceRow label="Frais de pension" amount={formatFCFA(pensions)} color="green" />
                <div className="border-t border-slate-200 pt-3 font-bold text-lg">
                  <span>Total : </span>
                  <span className="text-green-600">{formatFCFA(totalEntrees)}</span>
                </div>
              </div>
              {onNavigate && <p className="text-xs text-slate-400 mt-3">Cliquez pour voir le détail par école puis par classe</p>}
            </div>

            {/* Sorties d'argent */}
            <div
              onClick={onNavigate && (() => onNavigate('depenses', true))}
              className={`bg-white rounded-lg shadow-md p-6 ${onNavigate ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition' : ''}`}
            >
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
              {onNavigate && <p className="text-xs text-slate-400 mt-3">Cliquez pour voir le détail des dépenses</p>}
            </div>
          </div>

          {/* Bénéfice/Perte */}
          <div
            onClick={onNavigate && (() => onNavigate('rapports-finance', true))}
            className={`rounded-lg shadow-md p-6 text-white bg-gradient-to-r ${
              resultatNet >= 0 ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'
            } ${onNavigate ? 'cursor-pointer hover:brightness-110 transition' : ''}`}
          >
            <h2 className="text-lg font-bold mb-2">Résultat net — {libelle}</h2>
            <p className="text-2xl md:text-4xl font-bold break-words">{resultatNet >= 0 ? '+' : ''}{formatFCFA(resultatNet)}</p>
            <p className="text-sm font-semibold text-white/90 mt-1">
              {resultatNet >= 0 ? '📈 Vous gagnez de l\'argent sur cette période' : '📉 Vous perdez de l\'argent sur cette période'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20 text-sm">
              <div>
                <p className="text-white/70">Entrées</p>
                <p className="font-bold">{formatFCFA(totalEntrees)}</p>
              </div>
              <div>
                <p className="text-white/70">Sorties</p>
                <p className="font-bold">{formatFCFA(totalSorties)}</p>
              </div>
              <div>
                <p className="text-white/70">Reste à percevoir (élèves)</p>
                <p className="font-bold">{formatFCFA(resteAPercevoir)}</p>
              </div>
            </div>
            {onNavigate && <p className="text-xs text-white/70 mt-3">Cliquez pour le rapport financier complet</p>}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, icon, color, onClick }) {
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
    <div
      onClick={onClick}
      className={`rounded-lg shadow-md p-4 border-l-4 ${colorClasses[color]} ${onClick ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition' : ''}`}
    >
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
