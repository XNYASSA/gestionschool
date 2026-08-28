import { useState, useEffect, useMemo } from 'react'
import { GraduationCap, Loader, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { apiClient } from '../../api/client'

const TRIMESTRES = [1, 2, 3]

export default function Bulletins() {
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [eleves, setEleves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [ecoleId, setEcoleId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [mode, setMode] = useState('classe') // 'classe' = toute la classe, 'eleves' = sélection
  const [eleveIdsChoisis, setEleveIdsChoisis] = useState([])
  const [trimestre, setTrimestre] = useState(1)
  const [anneeScolaire, setAnneeScolaire] = useState('2024-2025')

  const [generation, setGeneration] = useState(false)
  const [resultats, setResultats] = useState(null)
  const [detailOuvert, setDetailOuvert] = useState({})

  const [showCoefficients, setShowCoefficients] = useState(false)
  const [matieres, setMatieres] = useState([])
  const [coeffEdits, setCoeffEdits] = useState({})

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
      if (ecolesData.length > 0) {
        setEcoleId(ecolesData[0].id)
        setAnneeScolaire(ecolesData[0].anneeScolaireEnCours || anneeScolaire)
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ecoleId) {
      const ecole = ecoles.find(e => e.id === ecoleId)
      if (ecole) setAnneeScolaire(ecole.anneeScolaireEnCours || anneeScolaire)
      loadMatieres(ecoleId)
      setClasseId('')
      setEleveIdsChoisis([])
      setResultats(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecoleId])

  const loadMatieres = async (id) => {
    try {
      const data = await apiClient.getMatieresByEcole(id)
      setMatieres(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des matières')
    }
  }

  const classesEcole = useMemo(() => classes.filter(c => c.ecoleId === ecoleId), [classes, ecoleId])
  const elevesClasse = useMemo(() => eleves.filter(e => e.classeId === classeId), [eleves, classeId])

  const toggleEleve = (id) => {
    setEleveIdsChoisis(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleGenerer = async () => {
    if (!classeId) return
    if (mode === 'eleves' && eleveIdsChoisis.length === 0) {
      setError('Sélectionnez au moins un élève')
      return
    }

    setGeneration(true)
    setError('')
    try {
      const payload = mode === 'classe'
        ? { classeId, trimestre, anneeScolaire }
        : { eleveIds: eleveIdsChoisis, trimestre, anneeScolaire }

      const data = await apiClient.genererBulletins(payload)
      setResultats(data)
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération des bulletins')
    } finally {
      setGeneration(false)
    }
  }

  const handleSaveCoeff = async (matiereId) => {
    const valeur = parseInt(coeffEdits[matiereId])
    if (isNaN(valeur) || valeur < 1) return
    try {
      await apiClient.updateMatiere(matiereId, { coefficient: valeur })
      await loadMatieres(ecoleId)
      setCoeffEdits(prev => { const c = { ...prev }; delete c[matiereId]; return c })
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du coefficient')
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
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-purple-500" /> Génération des bulletins
      </h2>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        ℹ️ Le modèle visuel définitif du bulletin (propre à chaque école/classe) sera appliqué une fois fourni.
        En attendant, la génération calcule les moyennes réelles à partir des notes saisies par les enseignants et des coefficients ci-dessous.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Sélection École / Classe / Élèves */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
            <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
            <select value={classeId} onChange={(e) => { setClasseId(e.target.value); setEleveIdsChoisis([]); setResultats(null) }} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              <option value="">Sélectionner</option>
              {classesEcole.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trimestre</label>
            <select value={trimestre} onChange={(e) => setTrimestre(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              {TRIMESTRES.map(t => <option key={t} value={t}>Trimestre {t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire</label>
            <input type="text" value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
          </div>
        </div>

        {classeId && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('classe')}
                className={`px-4 py-2 rounded-lg text-sm transition ${mode === 'classe' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Toute la classe ({elevesClasse.length} élèves)
              </button>
              <button
                onClick={() => setMode('eleves')}
                className={`px-4 py-2 rounded-lg text-sm transition ${mode === 'eleves' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Choisir des élèves
              </button>
            </div>

            {mode === 'eleves' && (
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {elevesClasse.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">Aucun élève dans cette classe</p>
                ) : (
                  elevesClasse.map(el => (
                    <label key={el.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={eleveIdsChoisis.includes(el.id)} onChange={() => toggleEleve(el.id)} className="w-4 h-4" />
                      {el.nom} {el.prenom} <span className="text-slate-400 text-xs">({el.matricule})</span>
                    </label>
                  ))
                )}
              </div>
            )}

            <button
              onClick={handleGenerer}
              disabled={generation}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {generation ? 'Génération...' : '📄 Générer le(s) bulletin(s)'}
            </button>
          </div>
        )}
      </div>

      {/* Coefficients des matières de l'école sélectionnée */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setShowCoefficients(!showCoefficients)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition"
        >
          <span className="font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Coefficients des matières — {ecoles.find(e => e.id === ecoleId)?.nomCourt}
          </span>
          {showCoefficients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showCoefficients && (
          matieres.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aucune matière définie pour cette école</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {matieres.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex-1 text-sm text-slate-900">{m.nom}</span>
                  <input
                    type="number"
                    min="1"
                    value={coeffEdits[m.id] ?? m.coefficient}
                    onChange={(e) => setCoeffEdits({ ...coeffEdits, [m.id]: e.target.value })}
                    className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center"
                  />
                  <button
                    onClick={() => handleSaveCoeff(m.id)}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition text-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Résultats */}
      {resultats && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-900">
            Bulletins générés ({resultats.length})
          </div>
          <div className="divide-y divide-slate-200">
            {resultats.map(r => (
              <div key={r.bulletinId}>
                <button
                  onClick={() => setDetailOuvert({ ...detailOuvert, [r.bulletinId]: !detailOuvert[r.bulletinId] })}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left"
                >
                  <div>
                    <span className="font-medium text-slate-900">{r.eleve.nom} {r.eleve.prenom}</span>
                    <span className="text-xs text-slate-500 ml-2">{r.eleve.classe} • {r.eleve.ecole}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">Rang {r.rang}/{r.effectif}</span>
                    <span className="font-bold text-purple-600">{r.moyenneGenerale}/20</span>
                    <span className="text-xs text-slate-600">{r.appreciation}</span>
                    {detailOuvert[r.bulletinId] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {detailOuvert[r.bulletinId] && (
                  <div className="px-4 pb-4">
                    {r.notes.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucune note validée pour ce trimestre</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1">Matière</th>
                            <th className="py-1 text-center">Note</th>
                            <th className="py-1 text-center">Coefficient</th>
                            <th className="py-1">Observation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.notes.map((n, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-1 text-slate-900">{n.matiere}</td>
                              <td className="py-1 text-center">{n.note}/20</td>
                              <td className="py-1 text-center">{n.coefficient}</td>
                              <td className="py-1 text-slate-500">{n.observation || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
