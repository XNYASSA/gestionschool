import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Edit2, Trash2, X } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'

export default function ListeEleves() {
  const [eleves, setEleves] = useState([])
  const [filteredEleves, setFilteredEleves] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEcole, setFilterEcole] = useState('')
  const [filterClasse, setFilterClasse] = useState('')
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('view') // view, create, edit
  const [selectedEleve, setSelectedEleve] = useState(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    sexe: 'MASCULIN',
    dateNaissance: '',
    classeId: '',
    nomParent: '',
    lieuParente: 'Père',
    telephoneParent: '',
    emailParent: '',
    adresseParent: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [eleves, searchTerm, filterEcole, filterClasse])

  const loadData = async () => {
    try {
      // Charger les écoles
      const ecolesRes = await fetch(`${API_ENDPOINTS.ecoles}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (ecolesRes.ok) {
        const ecolesData = await ecolesRes.json()
        setEcoles(ecolesData)

        // Récupérer tous les élèves de toutes les écoles
        let tousLesEleves = []
        let toutesLesClasses = []

        for (const ecole of ecolesData) {
          try {
            // Charger les élèves de cette école
            const elevesRes = await fetch(`${API_ENDPOINTS.ecoles}/${ecole.id}/eleves`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (elevesRes.ok) {
              const eleves = await elevesRes.json()
              tousLesEleves = [...tousLesEleves, ...eleves.map(e => ({ ...e, ecoleId: ecole.id, ecoleNom: ecole.nomCourt }))]
            }

            // Charger les classes de cette école
            const classesRes = await fetch(`${API_ENDPOINTS.ecoles}/${ecole.id}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (classesRes.ok) {
              const data = await classesRes.json()
              if (data.classes) {
                toutesLesClasses = [...toutesLesClasses, ...data.classes]
              }
            }
          } catch (error) {
            console.error(`Erreur chargement école ${ecole.id}:`, error)
          }
        }
        setEleves(tousLesEleves)
        setClasses(toutesLesClasses)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = eleves

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.matricule?.includes(searchTerm)
      )
    }

    if (filterEcole) {
      filtered = filtered.filter(e => e.ecoleId === filterEcole)
    }

    if (filterClasse) {
      filtered = filtered.filter(e => e.classeId === filterClasse)
    }

    setFilteredEleves(filtered)
  }

  const openCreateModal = () => {
    setFormData({
      nom: '',
      prenom: '',
      sexe: 'MASCULIN',
      dateNaissance: '',
      classeId: '',
      nomParent: '',
      lieuParente: 'Père',
      telephoneParent: '',
      emailParent: '',
      adresseParent: ''
    })
    setModalMode('create')
    setShowModal(true)
  }

  const openViewModal = (eleve) => {
    setSelectedEleve(eleve)
    setFormData(eleve)
    setModalMode('view')
    setShowModal(true)
  }

  const openEditModal = (eleve) => {
    setSelectedEleve(eleve)
    setFormData(eleve)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleDelete = async (eleveId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
      try {
        const response = await fetch(`${API_ENDPOINTS.ecoles.replace('/api/ecoles', '/api/eleves')}/${eleveId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.ok) {
          setEleves(eleves.filter(e => e.id !== eleveId))
          alert('Élève supprimé avec succès')
        }
      } catch (error) {
        console.error('Erreur suppression:', error)
        alert('Erreur lors de la suppression')
      }
    }
  }

  const handleSave = async () => {
    if (!formData.nom || !formData.prenom || !formData.classeId || !formData.telephoneParent) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      const method = modalMode === 'create' ? 'POST' : 'PUT'
      const eleveUrl = `${API_ENDPOINTS.ecoles.replace('/api/ecoles', '/api/eleves')}`
      const url = modalMode === 'create'
        ? eleveUrl
        : `${eleveUrl}/${selectedEleve.id}`

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(modalMode === 'create' ? 'Élève créé avec succès' : 'Élève modifié avec succès')
        setShowModal(false)
        loadData()
      } else {
        const error = await response.json()
        alert('Erreur: ' + (error.error || 'Erreur lors de la sauvegarde'))
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('Erreur: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">👥 Liste des élèves</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un élève
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={filterEcole}
            onChange={(e) => setFilterEcole(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Toutes les écoles</option>
            {ecoles.map(e => (
              <option key={e.id} value={e.id}>{e.nomCourt}</option>
            ))}
          </select>
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Toutes les classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Élèves ({filteredEleves.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">Chargement...</div>
        ) : filteredEleves.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun élève trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Matricule</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom - Prénom</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Classe</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">École</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Parent</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEleves.map(eleve => (
                  <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{eleve.matricule || '-'}</td>
                    <td className="px-6 py-3 text-slate-900">{eleve.prenom} {eleve.nom}</td>
                    <td className="px-6 py-3 text-slate-600">{eleve.classe?.nom || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{eleve.ecoleNom || '-'}</td>
                    <td className="px-6 py-3 text-slate-600 text-xs">{eleve.nomParent}</td>
                    <td className="px-6 py-3 text-center flex gap-2 justify-center">
                      <button
                        onClick={() => openViewModal(eleve)}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600 transition"
                        title="Consulter"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(eleve)}
                        className="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(eleve.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600 transition"
                        title="Supprimer"
                      >
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {modalMode === 'view' ? '👁️ Consulter élève' : modalMode === 'create' ? '➕ Créer élève' : '✎ Modifier élève'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sexe</label>
                  <select
                    value={formData.sexe}
                    onChange={(e) => setFormData({ ...formData, sexe: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  >
                    <option value="MASCULIN">Masculin</option>
                    <option value="FEMININ">Féminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={formData.dateNaissance}
                    onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe *</label>
                  <select
                    value={formData.classeId}
                    onChange={(e) => setFormData({ ...formData, classeId: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-900 block mb-3">Informations parent/tuteur</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom parent *</label>
                  <input
                    type="text"
                    value={formData.nomParent}
                    onChange={(e) => setFormData({ ...formData, nomParent: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lien</label>
                  <select
                    value={formData.lieuParente}
                    onChange={(e) => setFormData({ ...formData, lieuParente: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  >
                    <option value="Père">Père</option>
                    <option value="Mère">Mère</option>
                    <option value="Tuteur">Tuteur</option>
                    <option value="Oncle">Oncle</option>
                    <option value="Tante">Tante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone parent *</label>
                  <input
                    type="tel"
                    value={formData.telephoneParent}
                    onChange={(e) => setFormData({ ...formData, telephoneParent: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email parent</label>
                  <input
                    type="email"
                    value={formData.emailParent}
                    onChange={(e) => setFormData({ ...formData, emailParent: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={formData.adresseParent}
                    onChange={(e) => setFormData({ ...formData, adresseParent: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-slate-200">
              {modalMode !== 'view' && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {modalMode === 'create' ? 'Créer' : 'Modifier'}
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
