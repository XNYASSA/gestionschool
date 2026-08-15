import React, { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import { Plus, Search, Edit2, AlertCircle } from 'lucide-react'
import { formatFCFALong } from '../utils/formatters'
import EleveForm from './EleveForm'

export default function SecretairePage() {
  const [tab, setTab] = useState('eleves')
  const [eleves, setEleves] = useState([])
  const [filteredEleves, setFilteredEleves] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEleveId, setEditingEleveId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedClass, setSelectedClass] = useState('')

  const [frais, setFrais] = useState([])

  // Charger les élèves
  useEffect(() => {
    const fetchEleves = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getEleves()
        setEleves(data || [])
        setFilteredEleves(data || [])
      } catch (err) {
        setError('Erreur chargement élèves')
      } finally {
        setLoading(false)
      }
    }
    fetchEleves()
  }, [])

  // Charger les frais
  useEffect(() => {
    if (tab === 'frais') {
      const fetchFrais = async () => {
        try {
          const data = await apiClient.getFrais()
          setFrais(data || [])
        } catch (err) {
          console.error('Erreur frais:', err)
        }
      }
      fetchFrais()
    }
  }, [tab])

  // Filtrer élèves par section, classe et recherche
  useEffect(() => {
    let filtered = eleves

    if (selectedSection) {
      filtered = filtered.filter(e => e.classe?.section === selectedSection)
    }

    if (selectedClass) {
      filtered = filtered.filter(e => e.classe?.nom === selectedClass)
    }

    if (searchTerm) {
      filtered = filtered.filter(e =>
        `${e.nom} ${e.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.matricule.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEleves(filtered)
  }, [searchTerm, eleves, selectedSection, selectedClass])

  // Obtenir les classes pour la section sélectionnée
  const getClassesForSection = (section) => {
    if (!section) return []
    const classes = eleves
      .filter(e => e.classe?.section === section)
      .map(e => e.classe?.nom)
      .filter((v, i, a) => a.indexOf(v) === i)
    return classes
  }

  const handleFormSuccess = async () => {
    setShowForm(false)
    setEditingEleveId(null)
    // Recharger la liste
    const data = await apiClient.getEleves()
    setEleves(data || [])
  }

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold text-white">💼 Secrétaire</h1>
        <p className="text-gray-400 mt-2">Gestion des élèves et des inscriptions</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-4 border-b border-gray-700">
        <button
          onClick={() => setTab('eleves')}
          className={`px-6 py-4 font-semibold transition-all border-b-2 ${
            tab === 'eleves'
              ? 'text-blue-400 border-blue-400'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          👥 Élèves ({eleves.length})
        </button>
        <button
          onClick={() => setTab('frais')}
          className={`px-6 py-4 font-semibold transition-all border-b-2 ${
            tab === 'frais'
              ? 'text-blue-400 border-blue-400'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          💰 Frais & Paiements
        </button>
      </div>

      {/* TAB: ÉLÈVES */}
      {tab === 'eleves' && (
        <div className="space-y-6">
          {/* Filtres Section et Classe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value)
                  setSelectedClass('')
                }}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500"
              >
                <option value="">Toutes les sections</option>
                <option value="FRANCOPHONE">🇫🇷 Francophone</option>
                <option value="ANGLOPHONE">🇬🇧 Anglophone</option>
                <option value="TECHNIQUE">⚙️ Technique</option>
              </select>
            </div>

            {selectedSection && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Classe</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500"
                >
                  <option value="">Toutes les classes</option>
                  {getClassesForSection(selectedSection).map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Effectif</label>
              <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-bold">
                {filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Bouton Nouvel élève */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setEditingEleveId(null)
                setShowForm(true)
              }}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvel élève
            </button>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, prénom ou matricule..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Liste élèves */}
          {loading ? (
            <div className="text-center text-gray-400 py-8">Chargement...</div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-white">Matricule</th>
                      <th className="px-4 py-3 text-left text-white">Nom</th>
                      <th className="px-4 py-3 text-left text-white">Prénom</th>
                      <th className="px-4 py-3 text-left text-white">Classe</th>
                      <th className="px-4 py-3 text-left text-white">Parent</th>
                      <th className="px-4 py-3 text-left text-white">Téléphone</th>
                      <th className="px-4 py-3 text-center text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredEleves.map(eleve => (
                      <tr key={eleve.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 text-gray-300 font-mono">{eleve.matricule}</td>
                        <td className="px-4 py-3 text-gray-300 font-semibold">{eleve.nom}</td>
                        <td className="px-4 py-3 text-gray-300">{eleve.prenom}</td>
                        <td className="px-4 py-3 text-gray-400">{eleve.classe?.nom}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{eleve.nomParent}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{eleve.telephoneParent}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setEditingEleveId(eleve.id)
                              setShowForm(true)
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="text-xs">Modifier</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredEleves.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  {searchTerm ? 'Aucun élève trouvé' : 'Aucun élève'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: FRAIS */}
      {tab === 'frais' && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-white">Élève</th>
                  <th className="px-4 py-3 text-left text-white">Classe</th>
                  <th className="px-4 py-3 text-right text-white">Montant dû</th>
                  <th className="px-4 py-3 text-right text-white">Payé</th>
                  <th className="px-4 py-3 text-right text-white">Restant</th>
                  <th className="px-4 py-3 text-left text-white">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {frais.map(f => (
                  <tr key={f.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-semibold">{f.eleve?.nom} {f.eleve?.prenom}</td>
                    <td className="px-4 py-3 text-gray-400">{f.eleve?.classe?.nom}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatFCFALong(f.montantDu)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatFCFALong(f.montantPaye)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-semibold">{formatFCFALong(f.montantDu - f.montantPaye)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        f.statut === 'SOLDE' ? 'bg-green-500/20 text-green-400' :
                        f.statut === 'PARTIEL' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {f.statut === 'SOLDE' ? 'Soldé' : f.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {frais.length === 0 && (
            <div className="text-center text-gray-400 py-8">Aucun frais</div>
          )}
        </div>
      )}

      {/* Formulaire modal */}
      {showForm && (
        <EleveForm
          eleveId={editingEleveId}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingEleveId(null)
          }}
        />
      )}
    </div>
  )
}
