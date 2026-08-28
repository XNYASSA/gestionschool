import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { BookOpen, Users, DollarSign, FileText, Plus, LogOut, Search, X, Eye, Edit2, Trash2, TrendingUp, Clock } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'
import PersonnelRH from '../components/PersonnelRH'

export default function DashboardPrincipalDirectrice() {
  const { user, ecoleSelectionnee, selectEcole, ecoles, logout } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState('overview')
  const [eleves, setEleves] = useState([])
  const [classes, setClasses] = useState([])
  const [saisies, setSaisies] = useState([])

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterPaiement, setFilterPaiement] = useState('')

  // Modals
  const [showEleveForm, setShowEleveForm] = useState(false)
  const [showSaisieForm, setShowSaisieForm] = useState(false)
  const [selectedEleve, setSelectedEleve] = useState(null)

  // Forms
  const [eleveData, setEleveData] = useState({
    nom: '',
    prenom: '',
    matricule: '',
    email: '',
    dateNaissance: '',
    classeId: '',
    numeroParent: ''
  })

  const [saisieData, setSaisieData] = useState({
    type: 'FRAIS_COLLECTES',
    montantTotal: '',
    description: ''
  })

  const [stats, setStats] = useState({
    totalEleves: 0,
    totalFrais: 0,
    fraisCollectes: 0,
    fraisImpaye: 0,
    tauxCollecte: 0,
    classes: 0,
    derniereEntree: null
  })

  useEffect(() => {
    if (ecoleSelectionnee) {
      loadDashboard()
    }
  }, [ecoleSelectionnee])

  const loadDashboard = async () => {
    if (!ecoleSelectionnee) return
    try {
      // Charger les élèves
      const elevesRes = await fetch(`${API_ENDPOINTS.ecoles}/${ecoleSelectionnee.id}?include=eleves`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (elevesRes.ok) {
        const data = await elevesRes.json()
        setEleves(data.eleves || [])
        setClasses(data.classes || [])
      }

      // Charger les saisies du jour
      const saisiesRes = await fetch(
        `${API_ENDPOINTS.saisiesQuotidiennes}/${ecoleSelectionnee.id}?date=${new Date().toISOString().split('T')[0]}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      )
      if (saisiesRes.ok) {
        setSaisies(await saisiesRes.json())
      }

      // Calculer statistiques
      calculateStats(data?.eleves || [])
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    }
  }

  const calculateStats = (elevesList) => {
    const totalEleves = elevesList?.length || 0
    const fraisParEleve = 500000 // 500K FCFA par élève (exemple)
    const totalFrais = totalEleves * fraisParEleve

    // Simulation de statuts (en prod, provenir de l'API)
    const paye = elevesList?.filter(e => e.statusPaiement === 'SOLDE')?.length || Math.floor(totalEleves * 0.45)
    const partiel = elevesList?.filter(e => e.statusPaiement === 'PARTIEL')?.length || Math.floor(totalEleves * 0.25)
    const impaye = elevesList?.filter(e => e.statusPaiement === 'IMPAYE')?.length || totalEleves - paye - partiel

    const fraisCollectes = (paye * fraisParEleve) + (partiel * fraisParEleve * 0.5)
    const fraisImpaye = impaye * fraisParEleve

    setStats({
      totalEleves,
      totalFrais,
      fraisCollectes: Math.round(fraisCollectes),
      fraisImpaye: Math.round(fraisImpaye),
      tauxCollecte: totalFrais > 0 ? Math.round((fraisCollectes / totalFrais) * 100) : 0,
      classes: classes?.length || 0,
      derniereEntree: new Date()
    })
  }

  const handleCreateEleve = async (e) => {
    e.preventDefault()
    if (!eleveData.nom || !eleveData.prenom || !eleveData.classeId) return

    try {
      const response = await fetch(`${API_ENDPOINTS.ecoles}/${ecoleSelectionnee.id}/eleves`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...eleveData,
          ecoleId: ecoleSelectionnee.id
        })
      })

      if (response.ok) {
        setEleveData({ nom: '', prenom: '', matricule: '', email: '', dateNaissance: '', classeId: '', numeroParent: '' })
        setShowEleveForm(false)
        loadDashboard()
      }
    } catch (error) {
      console.error('Erreur création élève:', error)
    }
  }

  const handleSaisieSubmit = async (e) => {
    e.preventDefault()
    if (!saisieData.montantTotal) return

    try {
      const response = await fetch(`${API_ENDPOINTS.saisiesQuotidiennes}/${ecoleSelectionnee.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: new Date().toISOString(),
          type: saisieData.type,
          donnees: {
            montantTotal: parseInt(saisieData.montantTotal),
            description: saisieData.description
          }
        })
      })

      if (response.ok) {
        setSaisieData({ type: 'FRAIS_COLLECTES', montantTotal: '', description: '' })
        setShowSaisieForm(false)
        loadDashboard()
      }
    } catch (error) {
      console.error('Erreur création saisie:', error)
    }
  }

  // Filtrer élèves
  const filteredEleves = eleves?.filter(e => {
    const matchSearch = searchTerm === '' ||
      e.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.matricule?.includes(searchTerm)

    const matchClass = filterClass === '' || e.classeId === filterClass

    const matchPaiement = filterPaiement === '' || e.statusPaiement === filterPaiement

    return matchSearch && matchClass && matchPaiement
  }) || []

  if (!ecoleSelectionnee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Sélectionnez une école</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user?.roleAPI === 'PRINCIPAL' ? '👨‍💼' : '👩‍💼'} {ecoleSelectionnee?.nomComplet}
            </h1>
            <p className="text-sm text-slate-500">{ecoleSelectionnee?.niveau?.replace('_', ' ')}</p>
          </div>
          <div className="flex items-center gap-4">
            {ecoles && ecoles.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Établissement :</label>
                <select
                  value={ecoleSelectionnee?.id || ''}
                  onChange={(e) => selectEcole(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                >
                  {ecoles.map(ecole => (
                    <option key={ecole.id} value={ecole.id}>
                      {ecole.nomCourt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-slate-600 text-xs font-medium">Total élèves</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalEleves}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <p className="text-slate-600 text-xs font-medium">Frais collectés</p>
            <p className="text-2xl font-bold text-green-600">{(stats.fraisCollectes / 1000000).toFixed(1)}M</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <p className="text-slate-600 text-xs font-medium">Frais impayés</p>
            <p className="text-2xl font-bold text-red-600">{(stats.fraisImpaye / 1000000).toFixed(1)}M</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-slate-600 text-xs font-medium">Taux collecte</p>
            <p className="text-2xl font-bold text-purple-600">{stats.tauxCollecte}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-slate-600 text-xs font-medium">Classes</p>
            <p className="text-2xl font-bold text-orange-600">{stats.classes}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition ${
              activeTab === 'eleves'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Élèves
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition ${
              activeTab === 'finances'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 Finances
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition ${
              activeTab === 'notes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📝 Notes
          </button>
          <button
            onClick={() => setActiveTab('saisies')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition ${
              activeTab === 'saisies'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Saisies du jour
          </button>
          <button
            onClick={() => setActiveTab('annonces')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition ${
              activeTab === 'annonces'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📢 Annonces
          </button>
          <button
            onClick={() => setActiveTab('rh')}
            className={`px-4 py-3 font-medium whitespace-nowrap transition flex items-center gap-1 ${
              activeTab === 'rh'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" /> Emploi du temps
          </button>
        </div>

        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Résumé de l'école</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Évolution du taux</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-600">↑ 12%</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-slate-600">Élèves payants</p>
                <p className="text-2xl font-bold text-green-600">{Math.floor(stats.totalEleves * 0.7)}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-slate-600">En retard</p>
                <p className="text-2xl font-bold text-orange-600">{Math.floor(stats.totalEleves * 0.15)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-slate-600">Non payant</p>
                <p className="text-2xl font-bold text-red-600">{Math.floor(stats.totalEleves * 0.15)}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Élèves */}
        {activeTab === 'eleves' && (
          <div className="space-y-6">
            {/* Bouton créer élève */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowEleveForm(!showEleveForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Inscrire un élève
              </button>
            </div>

            {/* Formulaire création élève */}
            {showEleveForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Inscription d'un nouvel élève</h3>
                <form onSubmit={handleCreateEleve} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={eleveData.nom}
                      onChange={(e) => setEleveData({ ...eleveData, nom: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={eleveData.prenom}
                      onChange={(e) => setEleveData({ ...eleveData, prenom: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                    <select
                      value={eleveData.classeId}
                      onChange={(e) => setEleveData({ ...eleveData, classeId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={eleveData.email}
                      onChange={(e) => setEleveData({ ...eleveData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={eleveData.dateNaissance}
                      onChange={(e) => setEleveData({ ...eleveData, dateNaissance: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone parent</label>
                    <input
                      type="tel"
                      value={eleveData.numeroParent}
                      onChange={(e) => setEleveData({ ...eleveData, numeroParent: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Inscrire
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEleveForm(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filtres & Recherche */}
            <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, prénom ou matricule..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Toutes les classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <select
                  value={filterPaiement}
                  onChange={(e) => setFilterPaiement(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Tous les statuts</option>
                  <option value="SOLDE">✓ Payé</option>
                  <option value="PARTIEL">⚠ En retard</option>
                  <option value="IMPAYE">✗ Non payé</option>
                </select>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterClass('')
                    setFilterPaiement('')
                  }}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Tableau élèves */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">Élèves ({filteredEleves.length})</h3>
              </div>
              {filteredEleves.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Aucun élève trouvé</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Matricule</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Nom - Prénom</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Classe</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-700">Statut paiement</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEleves.map(eleve => (
                        <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-slate-600 text-xs">{eleve.matricule || '-'}</td>
                          <td className="px-4 py-2 text-slate-900">{eleve.prenom} {eleve.nom}</td>
                          <td className="px-4 py-2 text-slate-600">{eleve.classe?.nom || '-'}</td>
                          <td className="px-4 py-2 text-center">
                            {eleve.statusPaiement === 'SOLDE' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Payé</span>
                            )}
                            {eleve.statusPaiement === 'PARTIEL' && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">⚠ En retard</span>
                            )}
                            {eleve.statusPaiement === 'IMPAYE' && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">✗ Non payé</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center flex gap-1 justify-center">
                            <button className="p-1 hover:bg-blue-100 rounded text-blue-600">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 hover:bg-yellow-100 rounded text-yellow-600">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-1 hover:bg-red-100 rounded text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Finances */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <p className="text-slate-600 text-sm font-medium mb-2">Total dû</p>
                <p className="text-3xl font-bold text-green-600">{(stats.totalFrais / 1000000).toFixed(1)}M FCFA</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <p className="text-slate-600 text-sm font-medium mb-2">Collecté</p>
                <p className="text-3xl font-bold text-blue-600">{(stats.fraisCollectes / 1000000).toFixed(1)}M FCFA</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <p className="text-slate-600 text-sm font-medium mb-2">Reste à collecter</p>
                <p className="text-3xl font-bold text-red-600">{(stats.fraisImpaye / 1000000).toFixed(1)}M FCFA</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Évolution par classe</h3>
              <div className="space-y-3">
                {classes.map(classe => {
                  const classEleves = eleves?.filter(e => e.classeId === classe.id) || []
                  const collecte = classEleves.length * 500000 * 0.6
                  const total = classEleves.length * 500000
                  return (
                    <div key={classe.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-slate-900">{classe.nom}</span>
                        <span className="text-sm text-slate-600">{Math.round((collecte / total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(collecte / total) * 100}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Notes */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Visualisation des notes par classe</h2>
            <p className="text-slate-600 mb-4">Voir les résultats scolaires de vos élèves</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(classe => (
                <button
                  key={classe.id}
                  className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition text-left"
                >
                  <p className="font-semibold text-slate-900">{classe.nom}</p>
                  <p className="text-sm text-slate-600">Voir résultats ({eleves?.filter(e => e.classeId === classe.id).length || 0} élèves)</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Saisies */}
        {activeTab === 'saisies' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSaisieForm(!showSaisieForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouvelle saisie
              </button>
            </div>

            {showSaisieForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Saisir données du jour</h3>
                <form onSubmit={handleSaisieSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      value={saisieData.type}
                      onChange={(e) => setSaisieData({ ...saisieData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="FRAIS_COLLECTES">Frais collectés</option>
                      <option value="DEPENSES_VERIFIEES">Dépenses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={saisieData.montantTotal}
                      onChange={(e) => setSaisieData({ ...saisieData, montantTotal: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: 500000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={saisieData.description}
                      onChange={(e) => setSaisieData({ ...saisieData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSaisieForm(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">Saisies d'aujourd'hui</h3>
              </div>
              {saisies.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Aucune saisie pour aujourd'hui</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Heure</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Montant</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saisies.map(saisie => (
                        <tr key={saisie.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-900">
                            {new Date(saisie.createdAt || Date.now()).toLocaleTimeString('fr-FR')}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-900">{saisie.type}</td>
                          <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                            {saisie.donnees?.montantTotal?.toLocaleString('fr-FR') || '-'} FCFA
                          </td>
                          <td className="px-6 py-3 text-center">
                            {saisie.validee ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Validée</span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Annonces */}
        {activeTab === 'annonces' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Annonces internes</h2>
            <p className="text-slate-600 mb-4">Publiez des annonces pour le personnel</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle annonce
            </button>
          </div>
        )}

        {/* TAB: RH - Emploi du temps & Présences */}
        {activeTab === 'rh' && (
          <PersonnelRH ecoleSelectionnee={ecoleSelectionnee} />
        )}
      </div>
    </div>
  )
}
