import React, { useState, useContext, useEffect } from 'react'
import { BarChart3, Users, DollarSign, BookOpen, AlertTriangle, Loader, X } from 'lucide-react'
import { formatFCFALong, formatPercent } from '../utils/formatters'
import SectionSelector from '../components/SectionSelector'
import ClassSelector from '../components/ClassSelector'
import { useDashboard } from '../hooks/useDashboard'
import { apiClient } from '../api/client'
import AddStudentForm from './AddStudentForm'
import AddClassForm from './AddClassForm'
import UserManagement from './UserManagement'

export default function DashboardOwnerEnhanced({ filters }) {
  const { data: dashboardData, loading, error, refetch } = useDashboard()
  const stats = dashboardData || {}

  // Onglets du dashboard
  const [activeTab, setActiveTab] = useState('synthese')
  const [currentPage, setCurrentPage] = useState(null) // 'addStudent', 'addClass', 'users'

  // Navigation hiérarchique
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)

  // Modal pour détails des cartes KPI
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null) // 'collectes', 'impaye', 'partiel', 'salaires'
  const [modalTitle, setModalTitle] = useState('')

  // Modales pour paramètres
  const [showParamModal, setShowParamModal] = useState(false)
  const [paramType, setParamType] = useState(null) // 'classes', 'frais', 'matieres', 'periodes', 'infos', 'sections'
  const [paramTitle, setParamTitle] = useState('')

  // État pour édition d'infos établissement
  const [schoolInfo, setSchoolInfo] = useState({
    nom: 'Collège Rosa-Parks',
    localisation: 'Yaoundé, Cameroun',
    anneeScolaire: '2024-2025'
  })

  // État pour édition des classes
  const [editingClass, setEditingClass] = useState(null)
  const [newClass, setNewClass] = useState({
    nom: '',
    section: 'Francophone',
    niveau: ''
  })
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [matieres, setMatieres] = useState([])
  const [loadingMatieres, setLoadingMatieres] = useState(false)
  const [configurationsFrais, setConfigurationsFrais] = useState([])
  const [loadingConfigFrais, setLoadingConfigFrais] = useState(false)

  // État pour édition des frais
  const [fraisData, setFraisData] = useState({
    FRANCOPHONE: { inscription: 50000, fraisTotal: 80000, nbTranches: 3, tranche1: 30000, tranche2: 25000, tranche3: 25000 },
    ANGLOPHONE: { inscription: 55000, fraisTotal: 85000, nbTranches: 3, tranche1: 30000, tranche2: 30000, tranche3: 25000 },
    TECHNIQUE: { inscription: 45000, fraisTotal: 75000, nbTranches: 2, tranche1: 40000, tranche2: 35000, tranche3: 0 }
  })
  const [editingFrais, setEditingFrais] = useState(null)

  // État pour édition des matières
  const [editingMatiere, setEditingMatiere] = useState(null)
  const [newMatiere, setNewMatiere] = useState({
    nom: '',
    section: '',
    coefficient: 3
  })
  const [editMatiereCoeff, setEditMatiereCoeff] = useState({})

  // État pour édition des périodes
  const [editingPeriode, setEditingPeriode] = useState(null)
  const [newPeriode, setNewPeriode] = useState({
    nom: '',
    debut: '',
    fin: ''
  })

  // État pour les sections personnalisées
  const [sections, setSections] = useState([])
  const [newSection, setNewSection] = useState({ nom: '', emoji: '📚' })
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [loadingSections, setLoadingSections] = useState(false)

  // Charger les données au montage
  useEffect(() => {
    loadSections()
    loadMatieres()
    loadConfigurationsFrais()
  }, [])

  const loadMatieres = async () => {
    try {
      setLoadingMatieres(true)
      const data = await apiClient.getMatieres()
      setMatieres(data || [])
    } catch (err) {
      console.error('Erreur chargement matières:', err)
    } finally {
      setLoadingMatieres(false)
    }
  }

  const loadConfigurationsFrais = async () => {
    try {
      setLoadingConfigFrais(true)
      const data = await apiClient.getConfigurationsFrais()
      setConfigurationsFrais(data || [])

      // Initialiser fraisData à partir des configurations
      if (data && data.length > 0) {
        const newFraisData = {}
        data.forEach(config => {
          newFraisData[config.sectionId] = {
            inscription: config.montantInscription,
            fraisTotal: config.montantFraisTotal,
            nbTranches: config.tranches?.length || 3,
            tranche1: config.tranches?.[0]?.montant || 0,
            tranche2: config.tranches?.[1]?.montant || 0,
            tranche3: config.tranches?.[2]?.montant || 0
          }
        })
        setFraisData(newFraisData)
      }
    } catch (err) {
      console.error('Erreur chargement configurations frais:', err)
    } finally {
      setLoadingConfigFrais(false)
    }
  }

  // Initialiser newMatiere et fraisData quand les sections changent
  useEffect(() => {
    if (sections.length > 0) {
      // Initialiser newMatiere avec la première section
      if (!newMatiere.section) {
        setNewMatiere({...newMatiere, section: sections[0].id})
      }

      // Initialiser fraisData
      const newFraisData = {}
      sections.forEach(sec => {
        const sectionCode = sectionNameToCode(sec.nom)
        newFraisData[sectionCode] = fraisData[sectionCode] || {
          inscription: 50000,
          fraisTotal: 80000,
          nbTranches: 3,
          tranche1: 30000,
          tranche2: 25000,
          tranche3: 25000
        }
      })
      setFraisData(newFraisData)
    }
  }, [sections.length])

  const loadSections = async () => {
    try {
      setLoadingSections(true)
      const data = await apiClient.getSections()
      if (data && data.length > 0) {
        setSections(data)
      }
    } catch (err) {
      console.error('Erreur chargement sections:', err)
    } finally {
      setLoadingSections(false)
    }
  }

  const handleCreateSection = async () => {
    if (!newSection.nom || !newSection.emoji) {
      alert('⚠️ Veuillez entrer un emoji et un nom')
      return
    }

    try {
      setLoadingSections(true)
      const section = await apiClient.createSection(newSection.nom, newSection.emoji)
      setSections([...sections, section])
      setNewSection({ nom: '', emoji: '📚' })
      alert(`✓ Section "${newSection.emoji} ${newSection.nom}" créée avec succès !`)
    } catch (err) {
      alert('❌ Erreur: ' + (err.message || 'Impossible de créer la section'))
    } finally {
      setLoadingSections(false)
    }
  }

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return

    try {
      setLoadingSections(true)
      await apiClient.deleteSection(sectionId)
      setSections(sections.filter(s => s.id !== sectionId))
      alert('✓ Section supprimée avec succès !')
    } catch (err) {
      alert('❌ ' + (err.message || 'Erreur lors de la suppression'))
    } finally {
      setLoadingSections(false)
    }
  }

  const handleCreateClass = async () => {
    if (!newClass.nom || !newClass.niveau || !newClass.section) {
      alert('⚠️ Veuillez remplir tous les champs')
      return
    }

    try {
      setLoadingClasses(true)
      const sectionCode = sectionNameToCode(newClass.section)
      await apiClient.createClasse(newClass.nom, sectionCode, sectionCode, newClass.niveau)
      alert(`✓ Classe "${newClass.nom}" créée avec succès !`)
      setNewClass({nom: '', section: 'Francophone', niveau: ''})
      setEditingClass(null)
      // Recharger les données du dashboard
      window.location.reload()
    } catch (err) {
      alert('❌ Erreur: ' + (err.message || 'Impossible de créer la classe'))
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleCreateMatiere = async () => {
    if (!newMatiere.nom || !newMatiere.section) {
      alert('⚠️ Veuillez remplir tous les champs')
      return
    }

    try {
      setLoadingMatieres(true)
      await apiClient.createMatiere(newMatiere.nom, newMatiere.section, newMatiere.coefficient)
      alert(`✓ Matière "${newMatiere.nom}" ajoutée avec succès !`)
      setNewMatiere({nom: '', section: sections[0]?.id || 'FRANCOPHONE', coefficient: 3})
      loadMatieres()
    } catch (err) {
      alert('❌ Erreur: ' + (err.message || 'Impossible de créer la matière'))
    } finally {
      setLoadingMatieres(false)
    }
  }

  const handleDeleteMatiere = async (matiereId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) return

    try {
      setLoadingMatieres(true)
      await apiClient.deleteMatiere(matiereId)
      alert('✓ Matière supprimée avec succès !')
      loadMatieres()
    } catch (err) {
      alert('❌ ' + (err.message || 'Erreur lors de la suppression'))
    } finally {
      setLoadingMatieres(false)
    }
  }

  const handleUpdateMatiereCoeff = async (matiereId) => {
    const newCoeff = editMatiereCoeff[matiereId]
    if (!newCoeff || newCoeff < 1) {
      alert('⚠️ Veuillez entrer un coefficient valide')
      return
    }

    try {
      setLoadingMatieres(true)
      await apiClient.updateMatiere(matiereId, { coefficient: newCoeff })
      alert('✓ Coefficient mis à jour avec succès !')
      setEditMatiereCoeff({})
      loadMatieres()
    } catch (err) {
      alert('❌ Erreur: ' + (err.message || 'Impossible de mettre à jour'))
    } finally {
      setLoadingMatieres(false)
    }
  }

  const handleSaveConfigurationsFrais = async () => {
    try {
      setLoadingConfigFrais(true)
      // Mettre à jour chaque configuration et ses tranches
      for (const config of configurationsFrais) {
        const fraisConfig = fraisData[config.sectionId]
        if (fraisConfig) {
          // Mettre à jour la configuration
          await apiClient.updateConfigurationFrais(config.id, {
            montantInscription: fraisConfig.inscription,
            montantFraisTotal: fraisConfig.fraisTotal
          })

          // Mettre à jour les tranches
          for (let i = 1; i <= 3; i++) {
            if (i <= fraisConfig.nbTranches) {
              const montant = fraisConfig[`tranche${i}`]
              const tranche = config.tranches?.find(t => t.numero === i)
              if (tranche) {
                await apiClient.updateTranche(config.id, i, montant)
              }
            }
          }
        }
      }
      alert('✓ Configurations de frais mises à jour avec succès !')
      loadConfigurationsFrais()
    } catch (err) {
      alert('❌ Erreur: ' + (err.message || 'Impossible de mettre à jour'))
    } finally {
      setLoadingConfigFrais(false)
    }
  }

  const handleDeleteClass = async (className) => {
    const eleveCount = dashboardData?.eleves?.filter(e => e.classe?.nom === className).length || 0
    if (eleveCount > 0) {
      alert(`⚠️ Impossible de supprimer "${className}" car elle contient ${eleveCount} élève(s)`)
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer la classe "${className}" ?`)) return

    try {
      setLoadingClasses(true)
      // Trouver l'ID de la classe
      const classeToDelete = dashboardData?.eleves
        ?.find(e => e.classe?.nom === className)?.classe
      if (classeToDelete) {
        await apiClient.deleteClasse(classeToDelete.id)
        alert(`✓ Classe "${className}" supprimée avec succès !`)
        window.location.reload()
      }
    } catch (err) {
      alert('❌ ' + (err.message || 'Erreur lors de la suppression'))
    } finally {
      setLoadingClasses(false)
    }
  }

  // Map section names to codes for backward compatibility
  const sectionNameToCode = (name) => {
    const mapping = {
      'Francophone': 'FRANCOPHONE',
      'Anglophone': 'ANGLOPHONE',
      'Technique': 'TECHNIQUE'
    }
    return mapping[name] || name
  }

  // Format numbered list with totals
  const renderNumberedListWithTotal = (items, renderItem, showMontant = false) => {
    const total = showMontant ? items.reduce((sum, item) => sum + (item.montantDu || item.montant || 0), 0) : 0

    return (
      <div className="space-y-1 text-sm">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="flex items-start gap-3 bg-gray-700/50 p-2 rounded">
            <span className="text-gray-400 font-bold w-6">{idx + 1}.</span>
            <div className="flex-1">{renderItem(item)}</div>
            {showMontant && (
              <span className="text-green-400 font-semibold whitespace-nowrap">
                {formatFCFALong(item.montantDu || item.montant || 0)}
              </span>
            )}
          </div>
        ))}
        {showMontant && items.length > 0 && (
          <div className="flex items-start gap-3 bg-blue-700/30 p-2 rounded font-bold border-t border-blue-600 mt-2">
            <span className="text-blue-400 w-6"></span>
            <span className="flex-1 text-blue-300">TOTAL</span>
            <span className="text-blue-400">{formatFCFALong(total)}</span>
          </div>
        )}
      </div>
    )
  }

  // Données par section
  const getClassesBySection = (section) => {
    if (!dashboardData?.eleves) return []
    const sectionCode = sectionNameToCode(section)
    return dashboardData.eleves
      .filter(e => e.classe?.section === sectionCode)
      .map(e => e.classe?.nom)
      .filter((v, i, a) => a.indexOf(v) === i)
  }

  const getStudentsByClass = (className) => {
    if (!dashboardData?.eleves) return []
    return dashboardData.eleves.filter(e => e.classe?.nom === className)
  }

  const impayedStudents = dashboardData?.frais?.filter(f => f.statut === 'IMPAYE') || []
  const partialStudents = dashboardData?.frais?.filter(f => f.statut === 'PARTIEL') || []
  const paidStudents = dashboardData?.frais?.filter(f => f.statut === 'SOLDE') || []

  const handleOpenModal = (type, title) => {
    setModalType(type)
    setModalTitle(title)
    setShowModal(true)
  }

  const handleOpenParamModal = (type, title) => {
    setParamType(type)
    setParamTitle(title)
    setShowParamModal(true)
  }

  // Afficher les pages de gestion
  if (currentPage === 'addStudent') {
    return <AddStudentForm onBack={() => setCurrentPage(null)} onSuccess={() => {
      refetch()
      setCurrentPage(null)
    }} />
  }

  if (currentPage === 'addClass') {
    return <AddClassForm onBack={() => setCurrentPage(null)} onSuccess={() => {
      refetch()
      setCurrentPage(null)
    }} />
  }

  if (currentPage === 'users') {
    return <UserManagement />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500 text-red-300 px-6 py-4 rounded-lg">
        <p className="font-semibold">Erreur du tableau de bord</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  const tabs = [
    { id: 'synthese', label: 'Synthèse Globale', icon: BarChart3 },
    { id: 'eleves', label: 'Élèves', icon: Users },
    { id: 'frais', label: 'Frais & Paiements', icon: DollarSign },
    { id: 'parametres', label: 'Paramètres', icon: BookOpen }
  ]

  // Fonction pour compter les élèves par section (accepte le nom et le convertit en code)
  const getStudentsBySection = (sectionNameOrCode) => {
    if (!dashboardData?.eleves) return []
    const sectionCode = sectionNameToCode(sectionNameOrCode)
    return dashboardData.eleves.filter(e => e.classe?.section === sectionCode || e.classe?.section === sectionNameOrCode)
  }

  const getStudentsCountBySection = (sectionNameOrCode) => {
    return getStudentsBySection(sectionNameOrCode).length
  }

  const getTotalFeesBySection = (sectionNameOrCode) => {
    const students = getStudentsBySection(sectionNameOrCode)
    const studentIds = students.map(s => s.id)
    return (dashboardData?.frais || [])
      .filter(f => studentIds.includes(f.eleveId))
      .reduce((sum, f) => sum + (f.montantDu || 0), 0)
  }

  const getTotalPaidBySection = (sectionNameOrCode) => {
    const students = getStudentsBySection(sectionNameOrCode)
    const studentIds = students.map(s => s.id)
    return (dashboardData?.frais || [])
      .filter(f => studentIds.includes(f.eleveId))
      .reduce((sum, f) => sum + (f.montantPaye || 0), 0)
  }

  // Fonctions pour calculer les sommes par statut et section
  const getSumByStatusAndSection = (sectionNameOrCode, statut) => {
    const students = getStudentsBySection(sectionNameOrCode)
    const studentIds = students.map(s => s.id)
    return (dashboardData?.frais || [])
      .filter(f => studentIds.includes(f.eleveId) && f.statut === statut)
      .reduce((sum, f) => sum + (f.montantPaye || 0), 0)
  }

  const getSumDueByStatusAndSection = (sectionNameOrCode, statut) => {
    const students = getStudentsBySection(sectionNameOrCode)
    const studentIds = students.map(s => s.id)
    return (dashboardData?.frais || [])
      .filter(f => studentIds.includes(f.eleveId) && f.statut === statut)
      .reduce((sum, f) => sum + (f.montantDu || 0), 0)
  }

  const getTotalRemainingBySection = (sectionNameOrCode) => {
    const students = getStudentsBySection(sectionNameOrCode)
    const studentIds = students.map(s => s.id)
    const totalDue = (dashboardData?.frais || [])
      .filter(f => studentIds.includes(f.eleveId))
      .reduce((sum, f) => sum + (f.montantDu || 0), 0)
    const totalPaid = (dashboardData?.frais || [])
      .filter(f => studentIds.includes(f.eleveId))
      .reduce((sum, f) => sum + (f.montantPaye || 0), 0)
    return totalDue - totalPaid
  }

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold text-white">🔐 Tableau de Bord Admin</h1>
        <p className="text-gray-400 mt-2">Vue stratégique complète de l'établissement</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-4 border-b border-gray-700 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSelectedSection(null)
                setSelectedClass(null)
              }}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ONGLET 1: SYNTHÈSE GLOBALE */}
      {activeTab === 'synthese' && (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Carte Frais Collectés */}
            <button
              onClick={() => handleOpenModal('collectes', '💰 Frais Collectés')}
              className="bg-gradient-to-br from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 rounded-lg p-4 text-white cursor-pointer transition-all transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div className="text-left flex-1">
                  <p className="text-blue-100 text-xs font-medium">Frais Collectés</p>
                  <p className="text-2xl font-bold mt-1">{formatFCFALong(dashboardData?.totalFraisCollectes || 0)}</p>
                  <p className="text-blue-200 text-xs mt-1">{dashboardData?.percentageCollected || 0}%</p>
                </div>
                <DollarSign className="w-8 h-8 opacity-20 flex-shrink-0" />
              </div>
            </button>

            {/* Carte Montant Impayé */}
            <button
              onClick={() => handleOpenModal('impaye', '❌ Montant Impayé')}
              className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-lg p-4 text-white cursor-pointer transition-all transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div className="text-left flex-1">
                  <p className="text-orange-100 text-xs font-medium">Montant Impayé</p>
                  <p className="text-2xl font-bold mt-1">{formatFCFALong(dashboardData?.totalFraisRestant || 0)}</p>
                  <p className="text-orange-200 text-xs mt-1">{impayedStudents.length} élèves</p>
                </div>
                <AlertTriangle className="w-8 h-8 opacity-20 flex-shrink-0" />
              </div>
            </button>

            {/* Carte Masse Salariale */}
            <button
              onClick={() => handleOpenModal('salaires', '👥 Masse Salariale')}
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg p-4 text-white cursor-pointer transition-all transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div className="text-left flex-1">
                  <p className="text-blue-100 text-xs font-medium">Payroll</p>
                  <p className="text-2xl font-bold mt-1">{formatFCFALong(dashboardData?.totalSalaries || 0)}</p>
                  <p className="text-blue-200 text-xs mt-1">Mensuel</p>
                </div>
                <Users className="w-8 h-8 opacity-20 flex-shrink-0" />
              </div>
            </button>

            {/* Carte Résultat Net */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-blue-100 text-xs font-medium">Résultat Net</p>
                  <p className={`text-2xl font-bold mt-1 ${(dashboardData?.totalFraisCollectes || 0) - (dashboardData?.totalSalaries || 0) >= 0 ? 'text-green-300' : 'text-orange-300'}`}>
                    {formatFCFALong((dashboardData?.totalFraisCollectes || 0) - (dashboardData?.totalSalaries || 0))}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 opacity-20 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Détails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paiements */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-6">Statut des Paiements</h3>
              <div className="space-y-4">
                <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/50">
                  <p className="text-green-300 text-sm font-semibold">Soldés</p>
                  <p className="text-2xl font-bold text-green-400 mt-2">
                    {paidStudents.length} élèves
                  </p>
                </div>
                <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-500/50">
                  <p className="text-yellow-300 text-sm font-semibold">Partiels</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-2">
                    {partialStudents.length} élèves
                  </p>
                </div>
                <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/50">
                  <p className="text-red-300 text-sm font-semibold">Impayés</p>
                  <p className="text-2xl font-bold text-red-400 mt-2">
                    {impayedStudents.length} élèves
                  </p>
                </div>
              </div>
            </div>

            {/* Effectifs */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-6">Effectifs</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-300">Total Élèves</span>
                  <span className="text-2xl font-bold text-blue-400">{dashboardData?.eleves?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-300">Élèves en Échec</span>
                  <span className="text-2xl font-bold text-red-400">{dashboardData?.failedStudents || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Taux de Présence Global</span>
                  <span className="text-2xl font-bold text-green-400">{dashboardData?.attendanceRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2: ÉLÈVES */}
      {activeTab === 'eleves' && (
        <div className="space-y-6">
          {!selectedSection ? (
            <>
              <button
                onClick={() => setCurrentPage('addStudent')}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
              >
                ➕ Ajouter un Élève
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSection(sectionNameToCode(sec.nom))}
                    className="bg-gradient-to-br from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 rounded-lg p-4 text-white cursor-pointer transition-all transform hover:scale-105 text-left"
                  >
                    <p className="text-lg font-bold">{sec.emoji} {sec.nom}</p>
                    <p className="text-blue-200 text-sm mt-1">{getStudentsCountBySection(sec.nom)} élèves</p>
                    <p className="text-blue-300 text-xs mt-2">Total: {formatFCFALong(getTotalFeesBySection(sec.nom))}</p>
                  </button>
                ))}

                {/* Carte Tous les élèves */}
                <button
                  onClick={() => setSelectedSection('all')}
                  className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg p-4 text-white cursor-pointer transition-all transform hover:scale-105 text-left"
                >
                  <p className="text-lg font-bold">📋 Tous</p>
                  <p className="text-blue-200 text-sm mt-1">{dashboardData?.eleves?.length || 0} élèves</p>
                  <p className="text-blue-300 text-xs mt-2">Effectif total</p>
                </button>
              </div>
            </>
          ) : selectedSection === 'all' ? (
            <>
              <button
                onClick={() => setSelectedSection(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                ← Retour aux sections
              </button>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6">
                  Tous les Élèves de l'Établissement ({dashboardData?.eleves?.length || 0})
                </h3>
                <div className="space-y-1">
                  {dashboardData?.eleves?.map((eleve, idx) => {
                    const feeRecord = dashboardData?.frais?.find(f => f.eleveId === eleve.id)
                    return (
                      <div key={eleve.id} className="flex items-center gap-3 bg-gray-700/50 p-3 rounded text-sm">
                        <span className="text-gray-400 font-bold w-8">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-300 font-semibold">{eleve.nom} {eleve.prenom}</div>
                          <div className="text-xs text-gray-500">{eleve.classe?.nom} • {eleve.classe?.section}</div>
                        </div>
                        <div className="flex gap-4 text-right">
                          <div>
                            <div className="text-gray-400 text-xs">Dû</div>
                            <div className="text-gray-300 font-semibold">{formatFCFALong(feeRecord?.montantDu || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Payé</div>
                            <div className="text-green-400 font-semibold">{formatFCFALong(feeRecord?.montantPaye || 0)}</div>
                          </div>
                          <div className="min-w-20">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              feeRecord?.statut === 'SOLDE' ? 'bg-green-500/20 text-green-400' :
                              feeRecord?.statut === 'PARTIEL' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Total Footer */}
                  {dashboardData?.eleves && dashboardData.eleves.length > 0 && (
                    <div className="flex items-center gap-3 bg-blue-700/30 p-3 rounded font-bold border-t border-blue-600 mt-2">
                      <span className="text-blue-400 w-8"></span>
                      <div className="flex-1">TOTAL ({dashboardData.eleves.length} élèves)</div>
                      <div className="flex gap-4 text-right">
                        <div className="text-blue-400">
                          {formatFCFALong((dashboardData?.frais || []).reduce((sum, f) => sum + (f.montantDu || 0), 0))}
                        </div>
                        <div className="text-green-400">
                          {formatFCFALong((dashboardData?.frais || []).reduce((sum, f) => sum + (f.montantPaye || 0), 0))}
                        </div>
                        <div className="min-w-20"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : !selectedClass ? (
            <>
              <button
                onClick={() => setSelectedSection(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                ← Retour aux sections
              </button>
              <ClassSelector
                section={selectedSection}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                classes={getClassesBySection(selectedSection)}
              />
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  ← Sections
                </button>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  ← Retour à {selectedSection}
                </button>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6">
                  Élèves de {selectedClass} ({getStudentsByClass(selectedClass).length})
                </h3>
                <div className="space-y-1">
                  {getStudentsByClass(selectedClass).map((student, idx) => {
                    const feeRecord = dashboardData?.frais?.find(f => f.eleveId === student.id)
                    return (
                      <div key={student.id} className="flex items-center gap-3 bg-gray-700/50 p-3 rounded text-sm">
                        <span className="text-gray-400 font-bold w-8">{idx + 1}.</span>
                        <div className="flex-1">
                          <div className="text-gray-300 font-semibold">{student.nom} {student.prenom}</div>
                          <div className="text-xs text-gray-500">{student.classe?.section}</div>
                        </div>
                        <div className="flex gap-4 text-right">
                          <div>
                            <div className="text-gray-400 text-xs">Dû</div>
                            <div className="text-gray-300 font-semibold">{formatFCFALong(feeRecord?.montantDu || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Payé</div>
                            <div className="text-green-400 font-semibold">{formatFCFALong(feeRecord?.montantPaye || 0)}</div>
                          </div>
                          <div className="min-w-20">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              feeRecord?.statut === 'SOLDE' ? 'bg-green-500/20 text-green-400' :
                              feeRecord?.statut === 'PARTIEL' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Total Footer */}
                  {getStudentsByClass(selectedClass).length > 0 && (
                    <div className="flex items-center gap-3 bg-blue-700/30 p-3 rounded font-bold border-t border-blue-600 mt-2">
                      <span className="text-blue-400 w-8"></span>
                      <div className="flex-1">TOTAL ({getStudentsByClass(selectedClass).length} élèves)</div>
                      <div className="flex gap-4 text-right">
                        <div className="text-blue-400">
                          {formatFCFALong(
                            getStudentsByClass(selectedClass).reduce((sum, s) => {
                              const fee = dashboardData?.frais?.find(f => f.eleveId === s.id)
                              return sum + (fee?.montantDu || 0)
                            }, 0)
                          )}
                        </div>
                        <div className="text-green-400">
                          {formatFCFALong(
                            getStudentsByClass(selectedClass).reduce((sum, s) => {
                              const fee = dashboardData?.frais?.find(f => f.eleveId === s.id)
                              return sum + (fee?.montantPaye || 0)
                            }, 0)
                          )}
                        </div>
                        <div className="min-w-20"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ONGLET 3: FRAIS & PAIEMENTS */}
      {activeTab === 'frais' && (
        <div className="space-y-6">
          {/* Résumé des sommes par section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">📊 Sommes par Section</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {sections.map(sec => {
                const sectionCode = sectionNameToCode(sec.nom)
                return (
                <div key={sec.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-400 mb-4">
                    {sec.emoji} {sec.nom}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-700/50 rounded p-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">✓ Frais Soldés:</span>
                        <span className="text-green-400 font-semibold">{formatFCFALong(getSumByStatusAndSection(sectionCode, 'SOLDE'))}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">⚠ Frais Partiels:</span>
                        <span className="text-yellow-400 font-semibold">{formatFCFALong(getSumByStatusAndSection(sectionCode, 'PARTIEL'))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">✗ Frais Impayés:</span>
                        <span className="text-red-400 font-semibold">{formatFCFALong(getSumByStatusAndSection(sectionCode, 'IMPAYE'))}</span>
                      </div>
                    </div>

                    <hr className="border-gray-600" />

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-blue-300 font-semibold">Total Dû:</span>
                        <span className="text-blue-400 font-bold">{formatFCFALong(getSumDueByStatusAndSection(sectionCode, 'SOLDE') + getSumDueByStatusAndSection(sectionCode, 'PARTIEL') + getSumDueByStatusAndSection(sectionCode, 'IMPAYE'))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-300 font-semibold">Restant à Collecter:</span>
                        <span className="text-orange-400 font-bold">{formatFCFALong(getTotalRemainingBySection(sectionCode))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {!selectedSection ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSection(sectionNameToCode(sec.nom))}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg p-6 text-white cursor-pointer transition-all transform hover:scale-105"
                  >
                    <p className="text-2xl font-bold">{sec.emoji} {sec.nom}</p>
                    <p className="text-blue-200 text-sm mt-2">{getStudentsCountBySection(sec.nom)} élèves</p>
                    <p className="text-blue-300 text-xs mt-4">À collecter: {formatFCFALong(getTotalFeesBySection(sec.nom) - getTotalPaidBySection(sec.nom))}</p>
                  </button>
                ))}

                {/* Carte Tous les frais */}
                <button
                  onClick={() => setSelectedSection('all')}
                  className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg p-6 text-white cursor-pointer transition-all transform hover:scale-105"
                >
                  <p className="text-2xl font-bold">📋 Tous</p>
                  <p className="text-purple-200 text-sm mt-2">{dashboardData?.eleves?.length || 0} élèves</p>
                  <p className="text-purple-300 text-xs mt-4">Vue d'ensemble</p>
                </button>

                {/* Carte Tous les frais */}
                <button
                  onClick={() => setSelectedSection('all')}
                  className="bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg p-6 text-white cursor-pointer transition-all transform hover:scale-105"
                >
                  <p className="text-2xl font-bold">💰 Tous les Frais</p>
                  <p className="text-emerald-200 text-sm mt-2">{dashboardData?.eleves?.length || 0} élèves</p>
                  <p className="text-emerald-300 text-xs mt-4">À collecter: {formatFCFALong(dashboardData?.totalFraisRestant || 0)}</p>
                </button>
              </div>
            </>
          ) : selectedSection === 'all' ? (
            <>
              <button
                onClick={() => setSelectedSection(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                ← Retour aux sections
              </button>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6">Frais & Paiements - Tous les Élèves ({dashboardData?.eleves?.length || 0})</h3>
                <div className="space-y-1">
                  {dashboardData?.eleves?.map((eleve, idx) => {
                    const feeRecord = dashboardData?.frais?.find(f => f.eleveId === eleve.id)
                    return (
                      <div key={eleve.id} className="flex items-center gap-3 bg-gray-700/50 p-3 rounded text-sm">
                        <span className="text-gray-400 font-bold w-8">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-300 font-semibold">{eleve.nom} {eleve.prenom}</div>
                          <div className="text-xs text-gray-500">{eleve.classe?.nom} • {eleve.classe?.section}</div>
                        </div>
                        <div className="flex gap-4 text-right text-xs">
                          <div>
                            <div className="text-gray-400 text-xs">Dû</div>
                            <div className="text-gray-300 font-semibold">{formatFCFALong(feeRecord?.montantDu || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Payé</div>
                            <div className="text-green-400 font-semibold">{formatFCFALong(feeRecord?.montantPaye || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Restant</div>
                            <div className="text-red-400 font-semibold">{formatFCFALong((feeRecord?.montantDu || 0) - (feeRecord?.montantPaye || 0))}</div>
                          </div>
                          <div className="min-w-20">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              feeRecord?.statut === 'SOLDE' ? 'bg-green-500/20 text-green-400' :
                              feeRecord?.statut === 'PARTIEL' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Total Footer */}
                  {dashboardData?.eleves && dashboardData.eleves.length > 0 && (
                    <div className="flex items-center gap-3 bg-blue-700/30 p-3 rounded font-bold border-t border-blue-600 mt-2">
                      <span className="text-blue-400 w-8"></span>
                      <div className="flex-1">TOTAL ({dashboardData.eleves.length} élèves)</div>
                      <div className="flex gap-4 text-right text-xs">
                        <div className="text-blue-400">
                          {formatFCFALong((dashboardData?.frais || []).reduce((sum, f) => sum + (f.montantDu || 0), 0))}
                        </div>
                        <div className="text-green-400">
                          {formatFCFALong((dashboardData?.frais || []).reduce((sum, f) => sum + (f.montantPaye || 0), 0))}
                        </div>
                        <div className="text-red-400">
                          {formatFCFALong((dashboardData?.frais || []).reduce((sum, f) => sum + ((f.montantDu || 0) - (f.montantPaye || 0)), 0))}
                        </div>
                        <div className="min-w-20"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : !selectedClass ? (
            <>
              <button
                onClick={() => setSelectedSection(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                ← Retour aux sections
              </button>
              <ClassSelector
                section={selectedSection}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                classes={getClassesBySection(selectedSection)}
              />
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  ← Sections
                </button>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  ← Retour à {selectedSection}
                </button>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6">
                  Frais & Paiements - {selectedClass} ({getStudentsByClass(selectedClass).length})
                </h3>
                <div className="space-y-1">
                  {getStudentsByClass(selectedClass).map((student, idx) => {
                    const feeRecord = dashboardData?.frais?.find(f => f.eleveId === student.id)
                    return (
                      <div key={student.id} className="flex items-center gap-3 bg-gray-700/50 p-3 rounded text-sm">
                        <span className="text-gray-400 font-bold w-8">{idx + 1}.</span>
                        <div className="flex-1">
                          <div className="text-gray-300 font-semibold">{student.nom} {student.prenom}</div>
                        </div>
                        <div className="flex gap-4 text-right text-xs">
                          <div>
                            <div className="text-gray-400 text-xs">Dû</div>
                            <div className="text-gray-300 font-semibold">{formatFCFALong(feeRecord?.montantDu || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Payé</div>
                            <div className="text-green-400 font-semibold">{formatFCFALong(feeRecord?.montantPaye || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Restant</div>
                            <div className="text-red-400 font-semibold">{formatFCFALong((feeRecord?.montantDu || 0) - (feeRecord?.montantPaye || 0))}</div>
                          </div>
                          <div className="min-w-20">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              feeRecord?.statut === 'SOLDE' ? 'bg-green-500/20 text-green-400' :
                              feeRecord?.statut === 'PARTIEL' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Total Footer */}
                  {getStudentsByClass(selectedClass).length > 0 && (
                    <div className="flex items-center gap-3 bg-blue-700/30 p-3 rounded font-bold border-t border-blue-600 mt-2">
                      <span className="text-blue-400 w-8"></span>
                      <div className="flex-1">TOTAL ({getStudentsByClass(selectedClass).length} élèves)</div>
                      <div className="flex gap-4 text-right text-xs">
                        <div className="text-blue-400">
                          {formatFCFALong(
                            getStudentsByClass(selectedClass).reduce((sum, s) => {
                              const fee = dashboardData?.frais?.find(f => f.eleveId === s.id)
                              return sum + (fee?.montantDu || 0)
                            }, 0)
                          )}
                        </div>
                        <div className="text-green-400">
                          {formatFCFALong(
                            getStudentsByClass(selectedClass).reduce((sum, s) => {
                              const fee = dashboardData?.frais?.find(f => f.eleveId === s.id)
                              return sum + (fee?.montantPaye || 0)
                            }, 0)
                          )}
                        </div>
                        <div className="text-red-400">
                          {formatFCFALong(
                            getStudentsByClass(selectedClass).reduce((sum, s) => {
                              const fee = dashboardData?.frais?.find(f => f.eleveId === s.id)
                              return sum + ((fee?.montantDu || 0) - (fee?.montantPaye || 0))
                            }, 0)
                          )}
                        </div>
                        <div className="min-w-20"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ONGLET 4: PARAMÈTRES */}
      {activeTab === 'parametres' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gestion des Sections */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">📚 Gestion des Sections</h3>
              <p className="text-indigo-100 text-sm mb-4">Créer des sections (Maternelle, Primaire, Secondaire, etc.)</p>
              <p className="text-indigo-200 text-xs mb-4">Sections actuelles: {sections.length}</p>
              <button onClick={() => handleOpenParamModal('sections', '📚 Gestion des Sections')} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition-all">
                Gérer les Sections
              </button>
            </div>

            {/* Gestion des Classes */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">📚 Gestion des Classes</h3>
              <p className="text-blue-100 text-sm mb-4">Créer, modifier ou supprimer des classes</p>
              <p className="text-blue-200 text-xs mb-4">Classes actuelles: {dashboardData?.eleves?.reduce((acc, e) => {
                const className = e.classe?.nom
                return acc.includes(className) ? acc : [...acc, className]
              }, []).length || 0}</p>
              <div className="space-y-2">
                <button onClick={() => setCurrentPage('addClass')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-all">
                  ➕ Ajouter une Classe
                </button>
                <button onClick={() => handleOpenParamModal('classes', '📚 Gestion des Classes')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all">
                  Gérer les Classes
                </button>
              </div>
            </div>

            {/* Gestion des Utilisateurs */}
            <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">👥 Gestion des Utilisateurs</h3>
              <p className="text-red-100 text-sm mb-4">Créer des comptes, suspendre ou activer les utilisateurs</p>
              <p className="text-red-200 text-xs mb-4">Réservé aux administrateurs</p>
              <button onClick={() => setCurrentPage('users')} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-all">
                Gérer les Utilisateurs
              </button>
            </div>

            {/* Grilles de Frais */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">💰 Grilles de Frais</h3>
              <p className="text-green-100 text-sm mb-4">Configurer les frais par section et niveau</p>
              <p className="text-green-200 text-xs mb-4">Sections: Francophone, Anglophone, Technique</p>
              <button onClick={() => handleOpenParamModal('frais', '💰 Grilles de Frais')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-all">
                Configurer Grilles
              </button>
            </div>

            {/* Matières et Coefficients */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">📖 Matières & Coefficients</h3>
              <p className="text-purple-100 text-sm mb-4">Gérer les matières par section</p>
              <p className="text-purple-200 text-xs mb-4">Définir les coefficients d'évaluation</p>
              <button onClick={() => handleOpenParamModal('matieres', '📖 Matières & Coefficients')} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-all">
                Gérer Matières
              </button>
            </div>

            {/* Périodes & Tranches */}
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">📅 Périodes & Tranches</h3>
              <p className="text-orange-100 text-sm mb-4">Configurer les trimestres et tranches de paiement</p>
              <p className="text-orange-200 text-xs mb-4">Définir les échéances</p>
              <button onClick={() => handleOpenParamModal('periodes', '📅 Périodes & Tranches')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-all">
                Configurer Périodes
              </button>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">⚙️ Information de l'Établissement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Nom de l'école</p>
                <p className="text-white font-semibold">Collège Rosa-Parks</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Localisation</p>
                <p className="text-white font-semibold">Yaoundé, Cameroun</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Année scolaire</p>
                <p className="text-white font-semibold">2024-2025</p>
              </div>
              <div>
                <button onClick={() => handleOpenParamModal('infos', '⚙️ Informations de l\'Établissement')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all">
                  Modifier Infos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Détails des cartes KPI */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{modalTitle}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6">
              {modalType === 'collectes' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">Total Collecté</p>
                      <p className="text-3xl font-bold text-blue-400">{formatFCFALong(dashboardData?.totalFraisCollectes || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Nombre de Payeurs</p>
                      <p className="text-3xl font-bold text-green-400">{paidStudents.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Taux de Collecte</p>
                      <p className="text-3xl font-bold text-yellow-400">{dashboardData?.percentageCollected || 0}%</p>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-white">Élève</th>
                            <th className="px-4 py-3 text-left text-white">Classe</th>
                            <th className="px-4 py-3 text-right text-white">Montant Payé</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {paidStudents.map(f => (
                            <tr key={f.id} className="hover:bg-gray-700/50">
                              <td className="px-4 py-3 text-gray-300 font-semibold">{f.eleve?.nom} {f.eleve?.prenom}</td>
                              <td className="px-4 py-3 text-gray-400">{f.eleve?.classe?.nom}</td>
                              <td className="px-4 py-3 text-right text-green-400 font-bold">{formatFCFALong(f.montantPaye)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'impaye' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">Total Impayé</p>
                      <p className="text-3xl font-bold text-red-400">{formatFCFALong(dashboardData?.totalFraisRestant || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Nombre de Débiteurs</p>
                      <p className="text-3xl font-bold text-red-400">{impayedStudents.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">% de Non-Payeurs</p>
                      <p className="text-3xl font-bold text-red-400">
                        {((impayedStudents.length / (dashboardData?.eleves?.length || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-white">Élève</th>
                            <th className="px-4 py-3 text-left text-white">Classe</th>
                            <th className="px-4 py-3 text-right text-white">Montant Dû</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {impayedStudents.map(f => (
                            <tr key={f.id} className="hover:bg-gray-700/50">
                              <td className="px-4 py-3 text-gray-300 font-semibold">{f.eleve?.nom} {f.eleve?.prenom}</td>
                              <td className="px-4 py-3 text-gray-400">{f.eleve?.classe?.nom}</td>
                              <td className="px-4 py-3 text-right text-red-400 font-bold">{formatFCFALong(f.montantDu)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'salaires' && (
                <div className="space-y-4">
                  <p className="text-gray-300">
                    Pour gérer le personnel, allez à l'onglet <strong>Personnel & Finances</strong> dans le menu latéral.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE - Édition des Paramètres */}
      {showParamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{paramTitle}</h2>
              <button
                onClick={() => setShowParamModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {paramType === 'sections' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-indigo-400">Gérer les Sections</h3>

                  {/* Formulaire d'ajout */}
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-indigo-300 mb-4">➕ Ajouter une Section</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Emoji (ex: 🎓)"
                          value={newSection.emoji}
                          onChange={(e) => setNewSection({...newSection, emoji: e.target.value})}
                          className="col-span-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-center text-sm"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          placeholder="Nom (ex: Maternelle)"
                          value={newSection.nom}
                          onChange={(e) => setNewSection({...newSection, nom: e.target.value})}
                          className="col-span-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <button
                        onClick={handleCreateSection}
                        disabled={loadingSections}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded text-sm transition-all"
                      >
                        {loadingSections ? '⏳ Création...' : '➕ Créer Section'}
                      </button>
                    </div>
                  </div>

                  {/* Liste des sections */}
                  <div>
                    <h4 className="font-bold text-indigo-300 mb-4">📚 Sections Actuelles</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {sections.map(section => (
                        <div key={section.id} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{section.emoji}</span>
                            <div>
                              <div className="font-semibold text-white">{section.nom}</div>
                              <p className="text-xs text-gray-400">{section.id}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingSectionId(section.id)
                                setNewSection({ nom: section.nom, emoji: section.emoji })
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-all"
                            >
                              ✏️ Éditer
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.id)}
                              disabled={loadingSections}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded transition-all"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-4">
                    <p className="text-indigo-300 text-sm">
                      💡 <strong>Info:</strong> Vous pouvez créer des sections personnalisées (Maternelle, Primaire, Secondaire, etc.) et définir les classes pour chaque section.
                    </p>
                  </div>
                </div>
              )}

              {paramType === 'infos' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Nom de l'Établissement</label>
                    <input
                      type="text"
                      value={schoolInfo.nom}
                      onChange={(e) => setSchoolInfo({...schoolInfo, nom: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Localisation</label>
                    <input
                      type="text"
                      value={schoolInfo.localisation}
                      onChange={(e) => setSchoolInfo({...schoolInfo, localisation: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Année Scolaire</label>
                    <input
                      type="text"
                      value={schoolInfo.anneeScolaire}
                      onChange={(e) => setSchoolInfo({...schoolInfo, anneeScolaire: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      alert('✓ Informations sauvegardées avec succès!')
                      setShowParamModal(false)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
                  >
                    Sauvegarder les Modifications
                  </button>
                </div>
              )}

              {paramType === 'classes' && (
                <div className="space-y-6">
                  {/* Formulaire d'ajout/modification */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-blue-300 mb-4">{editingClass ? '✏️ Modifier la Classe' : '➕ Ajouter une Classe'}</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nom de la classe (ex: 6ème A)"
                        value={newClass.nom}
                        onChange={(e) => setNewClass({...newClass, nom: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <select
                        value={newClass.section}
                        onChange={(e) => setNewClass({...newClass, section: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="">-- Sélectionner une section --</option>
                        {sections.map(sec => (
                          <option key={sec.id} value={sec.nom}>
                            {sec.emoji} {sec.nom}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Niveau (ex: 6ème, Form 1, 2nde)"
                        value={newClass.niveau}
                        onChange={(e) => setNewClass({...newClass, niveau: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateClass}
                          disabled={loadingClasses}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-3 rounded text-sm transition-all"
                        >
                          {loadingClasses ? '⏳ Création...' : editingClass ? '💾 Modifier' : '➕ Ajouter'}
                        </button>
                        {editingClass && (
                          <button
                            onClick={() => {
                              setNewClass({nom: '', section: 'Francophone', niveau: ''})
                              setEditingClass(null)
                            }}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded text-sm transition-all"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Liste des classes */}
                  <div>
                    <h4 className="font-bold text-blue-300 mb-4">Classes Actuelles</h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {sections.map(section => {
                        const classes = getClassesBySection(section.nom)
                        return (
                          <div key={section.id} className="bg-gray-700/50 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-200 mb-3">
                              {section.emoji} {section.nom}
                            </h5>
                            <div className="space-y-2">
                              {classes.length > 0 ? (
                                classes.map(cls => {
                                  const count = dashboardData?.eleves?.filter(e => e.classe?.nom === cls).length || 0
                                  return (
                                    <div key={cls} className="flex justify-between items-center text-sm bg-gray-800 p-3 rounded">
                                      <div>
                                        <span className="text-gray-300 font-semibold">{cls}</span>
                                        <span className="text-gray-500 text-xs ml-2">({count} élève{count > 1 ? 's' : ''})</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingClass(cls)
                                            setNewClass({nom: cls, section: section, niveau: ''})
                                          }}
                                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-all"
                                        >
                                          ✏️ Éditer
                                        </button>
                                        <button
                                          onClick={() => handleDeleteClass(cls)}
                                          disabled={loadingClasses}
                                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded transition-all"
                                        >
                                          🗑️ Supprimer
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <p className="text-gray-500 text-xs">Aucune classe</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {paramType === 'frais' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-green-400">Gérer les Grilles de Frais</h3>

                  {/* Édition par section */}
                  <div className="space-y-6 max-h-[600px] overflow-y-auto">
                    {sections.map(sec => {
                      const sectionCode = sectionNameToCode(sec.nom)
                      return (
                      <div key={sec.id} className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <h4 className="font-bold text-green-300 mb-4">
                          {sec.emoji} {sec.nom}
                        </h4>

                        <div className="space-y-4">
                          {/* Inscription */}
                          <div>
                            <label className="block text-sm text-gray-300 font-semibold mb-2">📝 Montant d'Inscription</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={fraisData[sectionCode]?.inscription || 0}
                                onChange={(e) => setFraisData({
                                  ...fraisData,
                                  [sectionCode]: {...(fraisData[sectionCode] || {}), inscription: parseInt(e.target.value) || 0}
                                })}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              />
                              <span className="text-gray-400 text-xs">FCFA</span>
                            </div>
                          </div>

                          {/* Total Frais */}
                          <div>
                            <label className="block text-sm text-gray-300 font-semibold mb-2">💰 Frais Total (année)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={fraisData[sectionCode]?.fraisTotal || 0}
                                onChange={(e) => setFraisData({
                                  ...fraisData,
                                  [sectionCode]: {...(fraisData[sectionCode] || {}), fraisTotal: parseInt(e.target.value) || 0}
                                })}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              />
                              <span className="text-gray-400 text-xs">FCFA</span>
                            </div>
                          </div>

                          {/* Nombre de Tranches */}
                          <div>
                            <label className="block text-sm text-gray-300 font-semibold mb-2">📊 Nombre de Tranches</label>
                            <select
                              value={fraisData[sectionCode]?.nbTranches || 3}
                              onChange={(e) => setFraisData({
                                ...fraisData,
                                [sectionCode]: {...(fraisData[sectionCode] || {}), nbTranches: parseInt(e.target.value)}
                              })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            >
                              <option value="1">1 tranche</option>
                              <option value="2">2 tranches</option>
                              <option value="3">3 tranches</option>
                            </select>
                          </div>

                          {/* Tranches */}
                          <div className="bg-gray-700/50 rounded p-3 space-y-2">
                            <label className="block text-sm text-gray-300 font-semibold">💳 Montants par Tranche</label>
                            {[1, 2, 3].map(i => {
                              if (i > (fraisData[sectionCode]?.nbTranches || 3)) return null
                              return (
                                <div key={i} className="flex gap-2 items-center">
                                  <span className="text-gray-400 text-sm w-20">Tranche {i}:</span>
                                  <input
                                    type="number"
                                    value={fraisData[sectionCode]?.[`tranche${i}`] || 0}
                                    onChange={(e) => setFraisData({
                                      ...fraisData,
                                      [sectionCode]: {...(fraisData[sectionCode] || {}), [`tranche${i}`]: parseInt(e.target.value) || 0}
                                    })}
                                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                  />
                                  <span className="text-gray-400 text-xs">FCFA</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                    })}

                  </div>

                  <button
                    onClick={handleSaveConfigurationsFrais}
                    disabled={loadingConfigFrais}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded text-sm transition-all"
                  >
                    {loadingConfigFrais ? '⏳ Sauvegarde...' : '💾 Sauvegarder les Modifications'}
                  </button>

                  {/* Récapitulatif */}
                  <div>
                    <h4 className="font-bold text-green-300 mb-4">📊 Résumé des Configurations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {sections.map(sec => {
                        const sectionCode = sectionNameToCode(sec.nom)
                        return (
                        <div key={sec.id} className="bg-gray-700 rounded-lg p-4 text-sm">
                          <h5 className="font-bold text-green-300 mb-3">
                            {sec.emoji} {sec.nom}
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Inscription:</span>
                              <span className="text-blue-400 font-semibold">{formatFCFALong(fraisData[sectionCode]?.inscription || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Frais Total:</span>
                              <span className="text-green-400 font-semibold">{formatFCFALong(fraisData[sectionCode]?.fraisTotal || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Tranches:</span>
                              <span className="text-orange-400 font-semibold">{fraisData[sectionCode]?.nbTranches || 3}</span>
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {paramType === 'matieres' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-purple-400">Gérer les Matières & Coefficients</h3>

                  {/* Formulaire d'ajout */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-purple-300 mb-4">➕ Ajouter une Matière</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nom de la matière (ex: Mathématiques)"
                        value={newMatiere.nom}
                        onChange={(e) => setNewMatiere({...newMatiere, nom: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <select
                        value={newMatiere.section}
                        onChange={(e) => setNewMatiere({...newMatiere, section: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="">-- Sélectionner une section --</option>
                        {sections.map(sec => (
                          <option key={sec.id} value={sectionNameToCode(sec.nom)}>
                            {sec.emoji} {sec.nom}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <label className="text-sm text-gray-300 w-24">Coefficient:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newMatiere.coefficient}
                          onChange={(e) => setNewMatiere({...newMatiere, coefficient: parseInt(e.target.value) || 1})}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <button
                        onClick={handleCreateMatiere}
                        disabled={loadingMatieres}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded text-sm transition-all"
                      >
                        {loadingMatieres ? '⏳ Création...' : '➕ Ajouter'}
                      </button>
                    </div>
                  </div>

                  {/* Liste des matières */}
                  <div>
                    <h4 className="font-bold text-purple-300 mb-4">📚 Matières par Section</h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {sections.map(sec => {
                        const matieresSec = matieres.filter(m => m.sectionId === sec.id)
                        return (
                        <div key={sec.id} className="bg-gray-700 rounded-lg p-4">
                          <h5 className="font-bold text-purple-300 mb-3">
                            {sec.emoji} {sec.nom}
                          </h5>
                          <div className="space-y-2 text-sm">
                            {matieresSec.length > 0 ? (
                              matieresSec.map(matiere => (
                                <div key={matiere.id} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                  <span>{matiere.nom}</span>
                                  <div className="flex gap-2 items-center">
                                    {editMatiereCoeff[matiere.id] !== undefined ? (
                                      <>
                                        <input
                                          type="number"
                                          min="1"
                                          max="10"
                                          value={editMatiereCoeff[matiere.id]}
                                          onChange={(e) => setEditMatiereCoeff({...editMatiereCoeff, [matiere.id]: parseInt(e.target.value) || 1})}
                                          className="w-14 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs font-bold text-center"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleUpdateMatiereCoeff(matiere.id)}
                                          disabled={loadingMatieres}
                                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50 font-bold"
                                        >
                                          ✓ Valider
                                        </button>
                                        <button
                                          onClick={() => setEditMatiereCoeff({...editMatiereCoeff, [matiere.id]: undefined})}
                                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                        >
                                          ✕ Annuler
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-yellow-400 text-xs font-bold">Coef: {matiere.coefficient}</span>
                                        <button
                                          onClick={() => setEditMatiereCoeff({...editMatiereCoeff, [matiere.id]: matiere.coefficient})}
                                          disabled={loadingMatieres}
                                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50"
                                        >
                                          ✏️ Éditer
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMatiere(matiere.id)}
                                          disabled={loadingMatieres}
                                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                                        >
                                          🗑️ Supprimer
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 text-xs">Aucune matière</p>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {paramType === 'periodes' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-orange-400">Gérer les Périodes & Tranches</h3>

                  {/* Formulaire d'ajout */}
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-orange-300 mb-4">➕ Ajouter une Période</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nom (ex: 1er Trimestre)"
                        value={newPeriode.nom}
                        onChange={(e) => setNewPeriode({...newPeriode, nom: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Début</label>
                          <input
                            type="month"
                            value={newPeriode.debut}
                            onChange={(e) => setNewPeriode({...newPeriode, debut: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Fin</label>
                          <input
                            type="month"
                            value={newPeriode.fin}
                            onChange={(e) => setNewPeriode({...newPeriode, fin: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (newPeriode.nom && newPeriode.debut && newPeriode.fin) {
                            alert(`✓ Période "${newPeriode.nom}" ajoutée avec succès !`)
                            setNewPeriode({nom: '', debut: '', fin: ''})
                          } else {
                            alert('⚠️ Veuillez remplir tous les champs')
                          }
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded text-sm transition-all"
                      >
                        ➕ Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Trimestres */}
                  <div>
                    <h4 className="font-bold text-orange-300 mb-4">📚 Trimestres Scolaires</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      <div className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white">1er Trimestre</div>
                          <p className="text-xs text-gray-400">Septembre - Novembre</p>
                        </div>
                        <button
                          onClick={() => alert('✓ Période supprimée avec succès !')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-all"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white">2ème Trimestre</div>
                          <p className="text-xs text-gray-400">Décembre - Février</p>
                        </div>
                        <button
                          onClick={() => alert('✓ Période supprimée avec succès !')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-all"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white">3ème Trimestre</div>
                          <p className="text-xs text-gray-400">Mars - Juin</p>
                        </div>
                        <button
                          onClick={() => alert('✓ Période supprimée avec succès !')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-all"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tranches de paiement */}
                  <div>
                    <h4 className="font-bold text-orange-300 mb-4">💳 Tranches de Paiement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white">Tranche 1</span>
                          <span className="text-gray-400 text-xs ml-2">(Inscription)</span>
                        </div>
                        <span className="text-orange-300 text-xs font-semibold">À la rentrée</span>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white">Tranche 2</span>
                        </div>
                        <span className="text-orange-300 text-xs font-semibold">Décembre</span>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white">Tranche 3</span>
                        </div>
                        <span className="text-orange-300 text-xs font-semibold">Mars</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
