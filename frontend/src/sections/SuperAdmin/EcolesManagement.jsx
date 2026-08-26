import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Loader, School, Users, Layers, ArrowLeft } from 'lucide-react'
import { apiClient } from '../../api/client'

const NIVEAUX_ECOLE = [
  { value: 'SECONDAIRE', label: 'Secondaire (collège)' },
  { value: 'MATERNELLE_PRIMAIRE', label: 'Maternelle / Primaire' }
]

const emptyEcoleForm = {
  nomCourt: '',
  nomComplet: '',
  niveau: 'SECONDAIRE',
  adresse: 'Yaoundé, Cameroun',
  telephone: '',
  email: ''
}

const emptyClasseForm = { nom: '', niveau: '' }

export default function EcolesManagement({ section }) {
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [eleves, setEleves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drilldownEcoleId, setDrilldownEcoleId] = useState(null)

  // Réinitialiser le drill-down quand on change d'onglet dans la barre latérale
  useEffect(() => {
    setDrilldownEcoleId(null)
  }, [section])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [ecolesData, classesData, elevesData] = await Promise.all([
        apiClient.getEcoles(),
        apiClient.getClasses(),
        apiClient.getEleves()
      ])
      setEcoles(ecolesData)
      setClasses(classesData)
      setEleves(elevesData)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {section === 'create' ? (
        <CreateEcole onCreated={loadData} />
      ) : section === 'classes' || drilldownEcoleId ? (
        <GestionClasses
          ecoles={ecoles}
          classes={classes}
          eleves={eleves}
          onChange={loadData}
          initialEcoleId={drilldownEcoleId}
          onBack={drilldownEcoleId ? () => setDrilldownEcoleId(null) : null}
        />
      ) : (
        <ListeEcoles ecoles={ecoles} classes={classes} eleves={eleves} onChange={loadData} onSelectEcole={setDrilldownEcoleId} />
      )}
    </div>
  )
}

// ===================== LISTE DES ÉCOLES =====================

function ListeEcoles({ ecoles, classes, eleves, onChange, onSelectEcole }) {
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(emptyEcoleForm)

  const statsParEcole = useMemo(() => {
    const map = {}
    ecoles.forEach(e => { map[e.id] = { nbClasses: 0, nbEleves: 0 } })
    classes.forEach(c => { if (map[c.ecoleId]) map[c.ecoleId].nbClasses += 1 })
    eleves.forEach(e => {
      const ecoleId = e.classe?.ecoleId
      if (ecoleId && map[ecoleId]) map[ecoleId].nbEleves += 1
    })
    return map
  }, [ecoles, classes, eleves])

  const openEdit = (ecole) => {
    setFormData({
      nomCourt: ecole.nomCourt,
      nomComplet: ecole.nomComplet,
      niveau: ecole.niveau,
      adresse: ecole.adresse,
      telephone: ecole.telephone,
      email: ecole.email,
      actif: ecole.actif
    })
    setEditing(ecole.id)
  }

  const handleSave = async () => {
    if (!formData.nomCourt || !formData.nomComplet) {
      alert('Nom court et nom complet sont obligatoires')
      return
    }
    try {
      await apiClient.updateEcole(editing, formData)
      setEditing(null)
      onChange()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDelete = async (ecole) => {
    if (!confirm(`Supprimer ${ecole.nomComplet} ? Toutes ses classes, élèves et données associées seront définitivement supprimés.`)) return
    try {
      await apiClient.deleteEcole(ecole.id)
      onChange()
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">🏫 Liste des écoles</h2>
      <p className="text-sm text-slate-500 -mt-2">Cliquez sur une école pour voir et gérer ses classes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ecoles.map(ecole => {
          const stats = statsParEcole[ecole.id] || { nbClasses: 0, nbEleves: 0 }
          return (
            <div
              key={ecole.id}
              onClick={() => onSelectEcole(ecole.id)}
              className="bg-white rounded-lg shadow-md p-5 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-slate-900">{ecole.nomCourt}</h3>
                    <p className="text-xs text-slate-500">{ecole.nomComplet}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  ecole.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {ecole.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="text-sm text-slate-600 space-y-1 mb-3">
                <p>📍 {ecole.adresse}</p>
                <p>📞 {ecole.telephone}</p>
                <p>✉️ {ecole.email}</p>
                <p>🎓 {ecole.niveau === 'SECONDAIRE' ? 'Secondaire (collège)' : 'Maternelle / Primaire'}</p>
              </div>

              <div className="flex gap-4 text-sm border-t border-slate-100 pt-3 mb-3">
                <span className="flex items-center gap-1 text-slate-600">
                  <Layers className="w-4 h-4 text-blue-500" /> {stats.nbClasses} classe{stats.nbClasses > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <Users className="w-4 h-4 text-green-500" /> {stats.nbEleves} élève{stats.nbEleves > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(ecole) }}
                  className="p-2 hover:bg-yellow-100 rounded text-yellow-600 transition"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ecole) }}
                  className="p-2 hover:bg-red-100 rounded text-red-600 transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal édition */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">✎ Modifier l'école</h3>
              <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <EcoleFormFields formData={formData} setFormData={setFormData} />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                />
                <span className="text-sm text-slate-700">École active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-slate-200">
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Enregistrer
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== CRÉER UNE ÉCOLE =====================

function CreateEcole({ onCreated }) {
  const [formData, setFormData] = useState(emptyEcoleForm)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nomCourt || !formData.nomComplet) {
      alert('Nom court et nom complet sont obligatoires')
      return
    }
    try {
      await apiClient.createEcole(formData)
      setMessage(`École "${formData.nomCourt}" créée avec succès`)
      setFormData(emptyEcoleForm)
      onCreated()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900">➕ Créer une école</h2>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <EcoleFormFields formData={formData} setFormData={setFormData} />
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          Créer l'école
        </button>
      </form>
    </div>
  )
}

function EcoleFormFields({ formData, setFormData }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom court *</label>
          <input
            type="text"
            value={formData.nomCourt}
            onChange={(e) => setFormData({ ...formData, nomCourt: e.target.value })}
            placeholder="ex: CRP_FRANCOPHONE"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Niveau *</label>
          <select
            value={formData.niveau}
            onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            {NIVEAUX_ECOLE.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
        <input
          type="text"
          value={formData.nomComplet}
          onChange={(e) => setFormData({ ...formData, nomComplet: e.target.value })}
          placeholder="ex: Collège Rosa Parks francophone"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
        <input
          type="text"
          value={formData.adresse}
          onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
          <input
            type="tel"
            value={formData.telephone}
            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            placeholder="+237 6 XX XXX XXXX"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="info@ecole.cm"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>
    </>
  )
}

// ===================== GESTION DES CLASSES =====================

function GestionClasses({ ecoles, classes, eleves, onChange, initialEcoleId, onBack }) {
  const [selectedEcoleId, setSelectedEcoleId] = useState(initialEcoleId || ecoles[0]?.id || '')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyClasseForm)

  const classesEcole = classes.filter(c => c.ecoleId === selectedEcoleId)

  const nbElevesParClasse = useMemo(() => {
    const map = {}
    eleves.forEach(e => {
      map[e.classeId] = (map[e.classeId] || 0) + 1
    })
    return map
  }, [eleves])

  const openCreate = () => {
    setFormData(emptyClasseForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (classe) => {
    setFormData({ nom: classe.nom, niveau: classe.niveau })
    setEditingId(classe.id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.nom || !formData.niveau) {
      alert('Nom et niveau sont obligatoires')
      return
    }
    try {
      if (editingId) {
        await apiClient.updateClasse(editingId, formData)
      } else {
        await apiClient.createClasse(formData.nom, selectedEcoleId, formData.niveau)
      }
      setShowModal(false)
      onChange()
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDelete = async (classe) => {
    const nbEleves = nbElevesParClasse[classe.id] || 0
    const avertissement = nbEleves > 0 ? ` Cette classe contient ${nbEleves} élève(s) qui seront aussi supprimés.` : ''
    if (!confirm(`Supprimer la classe ${classe.nom} ?${avertissement}`)) return
    try {
      await apiClient.deleteClasse(classe.id)
      onChange()
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition" title="Retour à la liste des écoles">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-900">🏫 Gestion des classes</h2>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedEcoleId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Ajouter une classe
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
        <select
          value={selectedEcoleId}
          onChange={(e) => setSelectedEcoleId(e.target.value)}
          className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg"
        >
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Classes ({classesEcole.length})</h3>
        </div>
        {classesEcole.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucune classe pour cette école</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Niveau</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Élèves</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classesEcole.map(classe => (
                  <tr key={classe.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{classe.nom}</td>
                    <td className="px-6 py-3 text-slate-600">{classe.niveau}</td>
                    <td className="px-6 py-3 text-center text-slate-600">{nbElevesParClasse[classe.id] || 0}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => openEdit(classe)} className="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(classe)} className="p-1 hover:bg-red-100 rounded text-red-600 transition" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? '✎ Modifier la classe' : '➕ Ajouter une classe'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la classe *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="ex: 6ème C"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Niveau *</label>
                <input
                  type="text"
                  value={formData.niveau}
                  onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                  placeholder="ex: 6ème"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-slate-200">
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                {editingId ? 'Enregistrer' : 'Créer'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
