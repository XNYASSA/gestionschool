import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'
import { BookOpen, Users, BarChart3, LogOut, Plus } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'
import { apiClient } from '../api/client'

export default function DashboardEnseignant() {
  const { user, ecoleSelectionnee, selectEcole, ecoles, logout } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState('classes')
  const [classes, setClasses] = useState([])
  const [selectedClasse, setSelectedClasse] = useState(null)
  const [eleves, setEleves] = useState([])
  const [showGradeForm, setShowGradeForm] = useState(false)
  const [gradeData, setGradeData] = useState({
    eleveId: '',
    matiere: '',
    note: '',
    commentaire: ''
  })

  // Cahier de texte
  const [mesEcm, setMesEcm] = useState([])
  const [selectedEcmId, setSelectedEcmId] = useState('')
  const [lecons, setLecons] = useState([])
  const [objectifInput, setObjectifInput] = useState('')
  const [leconData, setLeconData] = useState({ date: new Date().toISOString().split('T')[0], titre: '', contenu: '' })
  const [cahierError, setCahierError] = useState('')

  useEffect(() => {
    if (ecoleSelectionnee) {
      loadClasses()
    }
  }, [ecoleSelectionnee])

  useEffect(() => {
    if (activeTab === 'cahier') {
      loadMesEcm()
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedEcmId) {
      loadLecons(selectedEcmId)
      const ecm = mesEcm.find(e => e.ecmId === selectedEcmId)
      setObjectifInput(ecm ? String(ecm.nombreLeconsPrevues) : '')
    }
  }, [selectedEcmId])

  const loadMesEcm = async () => {
    setCahierError('')
    try {
      const data = await apiClient.getMesEcm()
      setMesEcm(data)
      if (data.length > 0 && !selectedEcmId) {
        setSelectedEcmId(data[0].ecmId)
      }
    } catch (error) {
      setCahierError(error.message || 'Erreur lors du chargement de vos affectations')
    }
  }

  const loadLecons = async (ecmId) => {
    try {
      const data = await apiClient.getLecons(ecmId)
      setLecons(data)
    } catch (error) {
      setCahierError(error.message || 'Erreur lors du chargement des leçons')
    }
  }

  const handleObjectifSubmit = async (e) => {
    e.preventDefault()
    const valeur = parseInt(objectifInput)
    if (isNaN(valeur) || valeur < 0) return

    try {
      await apiClient.updateObjectifLecons(selectedEcmId, valeur)
      await loadMesEcm()
    } catch (error) {
      setCahierError(error.message || 'Erreur lors de la mise à jour de l\'objectif')
    }
  }

  const handleLeconSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEcmId || !leconData.date || !leconData.titre) return

    try {
      await apiClient.createLecon({ ecmId: selectedEcmId, ...leconData })
      setLeconData({ date: new Date().toISOString().split('T')[0], titre: '', contenu: '' })
      await loadLecons(selectedEcmId)
      await loadMesEcm()
    } catch (error) {
      setCahierError(error.message || 'Erreur lors de l\'enregistrement de la leçon')
    }
  }

  const ecmSelectionne = mesEcm.find(e => e.ecmId === selectedEcmId)

  const loadClasses = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ecoles}/${ecoleSelectionnee?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error('Erreur chargement classes:', error)
    }
  }

  const selectClasse = async (classe) => {
    setSelectedClasse(classe)
    try {
      const response = await fetch(`${API_ENDPOINTS.ecoles}/${ecoleSelectionnee?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEleves(data.eleves?.filter(e => e.classeId === classe.id) || [])
      }
    } catch (error) {
      console.error('Erreur chargement élèves:', error)
    }
  }

  const handleGradeSubmit = async (e) => {
    e.preventDefault()
    if (!gradeData.eleveId || !gradeData.note) return

    try {
      const response = await fetch(`${API_ENDPOINTS.bulletins}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eleveId: gradeData.eleveId,
          matiere: gradeData.matiere,
          note: parseFloat(gradeData.note),
          commentaire: gradeData.commentaire,
          date: new Date().toISOString()
        })
      })

      if (response.ok) {
        setGradeData({ eleveId: '', matiere: '', note: '', commentaire: '' })
        setShowGradeForm(false)
      }
    } catch (error) {
      console.error('Erreur enregistrement note:', error)
    }
  }

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
            <h1 className="text-2xl font-bold text-slate-900">👨‍🏫 Tableau de bord Enseignant</h1>
            <p className="text-sm text-slate-500">{user?.name} • {ecoleSelectionnee?.nomCourt}</p>
          </div>
          <div className="flex items-center gap-4">
            {ecoles && ecoles.length > 1 && (
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
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'classes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📚 Mes classes
          </button>
          <button
            onClick={() => setActiveTab('cahier')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'cahier'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📖 Cahier de texte
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'notes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📝 Saisie de notes
          </button>
          <button
            onClick={() => setActiveTab('presence')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'presence'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✓ Appel
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Mes classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500">
                  Aucune classe assignée
                </div>
              ) : (
                classes.map(classe => (
                  <div
                    key={classe.id}
                    onClick={() => selectClasse(classe)}
                    className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{classe.nom}</h3>
                        <p className="text-sm text-slate-600">{classe.niveau}</p>
                      </div>
                      <BookOpen className="w-8 h-8 text-blue-500 opacity-30" />
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Enseignant assigné</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedClasse && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Élèves - {selectedClasse.nom}
                </h3>
                {eleves.length === 0 ? (
                  <p className="text-slate-500">Aucun élève dans cette classe</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Matricule</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nom</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Prénom</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eleves.map(eleve => (
                          <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-6 py-3 text-sm font-mono text-slate-900">{eleve.matricule}</td>
                            <td className="px-6 py-3 text-sm text-slate-900">{eleve.nom}</td>
                            <td className="px-6 py-3 text-sm text-slate-900">{eleve.prenom}</td>
                            <td className="px-6 py-3 text-center">
                              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                Voir bulletin
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cahier' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Cahier de texte — Progression du programme</h2>

            {cahierError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {cahierError}</div>
            )}

            {mesEcm.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
                Aucune classe/matière ne vous est encore affectée.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe / Matière</label>
                  <select
                    value={selectedEcmId}
                    onChange={(e) => setSelectedEcmId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {mesEcm.map(ecm => (
                      <option key={ecm.ecmId} value={ecm.ecmId}>
                        {ecm.classeNom} — {ecm.matiereNom} ({ecm.ecoleNom})
                      </option>
                    ))}
                  </select>
                </div>

                {ecmSelectionne && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900">Progression</span>
                      <span className="text-2xl font-bold text-orange-600">{ecmSelectionne.pourcentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          ecmSelectionne.pourcentage >= 75 ? 'bg-green-500' : ecmSelectionne.pourcentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${ecmSelectionne.pourcentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      {ecmSelectionne.nombreLeconsFaites} leçon(s) faite(s) · {ecmSelectionne.nombreLeconsRestantes} restante(s) sur {ecmSelectionne.nombreLeconsPrevues} prévue(s)
                    </p>

                    <form onSubmit={handleObjectifSubmit} className="flex items-end gap-2 mt-4 pt-4 border-t border-slate-200">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de leçons prévues (année)</label>
                        <input
                          type="number"
                          min="0"
                          value={objectifInput}
                          onChange={(e) => setObjectifInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition">
                        Mettre à jour
                      </button>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Saisir une leçon faite</h3>
                  <form onSubmit={handleLeconSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={leconData.date}
                          onChange={(e) => setLeconData({ ...leconData, date: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la leçon</label>
                        <input
                          type="text"
                          value={leconData.titre}
                          onChange={(e) => setLeconData({ ...leconData, titre: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder="Ex: Les fractions"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contenu (facultatif)</label>
                      <textarea
                        value={leconData.contenu}
                        onChange={(e) => setLeconData({ ...leconData, contenu: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        rows="2"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      Enregistrer la leçon
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-4">
                    <h3 className="font-bold text-slate-900">Leçons saisies ({lecons.length})</h3>
                  </div>
                  {lecons.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Aucune leçon saisie pour cette classe/matière</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Titre</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Contenu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lecons.map(lecon => (
                            <tr key={lecon.id} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-600">{new Date(lecon.date).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-slate-900">{lecon.titre}</td>
                              <td className="px-4 py-2 text-slate-600">{lecon.contenu || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Saisie de notes</h2>
              <button
                onClick={() => setShowGradeForm(!showGradeForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Saisir note
              </button>
            </div>

            {showGradeForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Enregistrer une note</h3>
                <form onSubmit={handleGradeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                    <select
                      value={selectedClasse?.id || ''}
                      onChange={(e) => {
                        const classe = classes.find(c => c.id === e.target.value)
                        if (classe) selectClasse(classe)
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Sélectionner une classe</option>
                      {classes.map(classe => (
                        <option key={classe.id} value={classe.id}>
                          {classe.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Élève</label>
                    <select
                      value={gradeData.eleveId}
                      onChange={(e) => setGradeData({ ...gradeData, eleveId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Sélectionner un élève</option>
                      {eleves.map(eleve => (
                        <option key={eleve.id} value={eleve.id}>
                          {eleve.prenom} {eleve.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                    <input
                      type="text"
                      value={gradeData.matiere}
                      onChange={(e) => setGradeData({ ...gradeData, matiere: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: Mathématiques"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Note (0-20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={gradeData.note}
                      onChange={(e) => setGradeData({ ...gradeData, note: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: 15.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire (facultatif)</label>
                    <textarea
                      value={gradeData.commentaire}
                      onChange={(e) => setGradeData({ ...gradeData, commentaire: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows="2"
                      placeholder="Ex: Excellent travail!"
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
                      onClick={() => setShowGradeForm(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Notes récentes</h3>
              <p className="text-slate-500">Les notes saisies apparaîtront ici</p>
            </div>
          </div>
        )}

        {activeTab === 'presence' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Appel - Présence des élèves</h2>
            <p className="text-slate-600 mb-4">Sélectionnez une classe pour faire l'appel</p>

            {selectedClasse && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900">{selectedClasse.nom}</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {eleves.map(eleve => (
                    <div
                      key={eleve.id}
                      className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded"
                      />
                      <span className="flex-1 text-slate-900">{eleve.prenom} {eleve.nom}</span>
                      <span className="text-xs text-slate-500">{eleve.matricule}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Valider l'appel
                </button>
              </div>
            )}

            {!selectedClasse && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(classe => (
                  <button
                    key={classe.id}
                    onClick={() => selectClasse(classe)}
                    className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition text-left"
                  >
                    <p className="font-semibold text-slate-900">{classe.nom}</p>
                    <p className="text-sm text-slate-600">{classe.niveau}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
