import { useState, useEffect, useMemo, useContext } from 'react'
import { GraduationCap, Loader, ChevronDown, ChevronUp, Eye, Printer, Download, X, Save, ClipboardList } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthContext } from '../../context/AuthContext'
import BulletinTemplate from './BulletinTemplate'
import ProgrammeClasse from './ProgrammeClasse'
import { ANNEE_SCOLAIRE_COURANTE, ANNEES_SCOLAIRES } from '../../utils/anneeScolaire'
import { telechargerPdfDepuisElement, nomFichierSur } from '../../utils/exportTableau'

const TRIMESTRES = [1, 2, 3]

const champsDiscipline = (b) => ({
  exclusionDefinitive: !!b?.exclusionDefinitive,
  joursExclusion: b?.joursExclusion ?? '',
  absenteisme: !!b?.absenteisme,
  conduiteDeplorable: !!b?.conduiteDeplorable,
  convocation: !!b?.convocation,
  tableauHonneur: !!b?.tableauHonneur,
  encouragement: !!b?.encouragement,
  felicitations: !!b?.felicitations,
  avertissementTravail: !!b?.avertissementTravail,
  blameTravail: !!b?.blameTravail,
  avertissementConduite: !!b?.avertissementConduite,
  blameConduite: !!b?.blameConduite,
  observationConseil: b?.observationConseil || ''
})

const CASES_DISCIPLINE = [
  { cle: 'exclusionDefinitive', label: 'Exclusion définitive' },
  { cle: 'absenteisme', label: 'Absentéisme' },
  { cle: 'conduiteDeplorable', label: 'Conduite déplorable' },
  { cle: 'convocation', label: 'Convocation' }
]
const CASES_CONSEIL = [
  { cle: 'tableauHonneur', label: 'TH — Tableau d\'honneur' },
  { cle: 'encouragement', label: 'ENC — Encouragement' },
  { cle: 'felicitations', label: 'FEL — Félicitations' },
  { cle: 'avertissementTravail', label: 'AT — Avert. travail' },
  { cle: 'blameTravail', label: 'BT — Blâme travail' },
  { cle: 'avertissementConduite', label: 'AC — Avert. conduite' },
  { cle: 'blameConduite', label: 'BC — Blâme conduite' }
]

export default function Bulletins({ onNavigate }) {
  const { user } = useContext(AuthContext)
  const peutModifierProgramme = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE'].includes(user?.roleAPI)

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
  const [anneeScolaire, setAnneeScolaire] = useState(ANNEE_SCOLAIRE_COURANTE)

  const [generation, setGeneration] = useState(false)
  const [resultats, setResultats] = useState(null)
  const [detailOuvert, setDetailOuvert] = useState({})

  const [bulletinAffiche, setBulletinAffiche] = useState(null)
  const [chargementApercu, setChargementApercu] = useState(false)
  const [formDiscipline, setFormDiscipline] = useState(null)
  const [enregistrementDiscipline, setEnregistrementDiscipline] = useState(false)
  const [afficherDiscipline, setAfficherDiscipline] = useState(false)
  const [telechargementPdf, setTelechargementPdf] = useState(false)

  const telechargerBulletinPdf = async () => {
    if (!bulletinAffiche) return
    setTelechargementPdf(true)
    try {
      const nom = nomFichierSur(`Bulletin-${bulletinAffiche.eleve.nom}-${bulletinAffiche.eleve.prenom}-T${bulletinAffiche.trimestre}`)
      await telechargerPdfDepuisElement(document.getElementById('bulletin-print-area'), nom)
    } catch (err) {
      alert(err.message || 'Erreur lors de la génération du PDF')
    } finally {
      setTelechargementPdf(false)
    }
  }

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
      if (ecolesData.length > 0) setEcoleId(ecolesData[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ecoleId) {
      setClasseId('')
      setEleveIdsChoisis([])
      setResultats(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecoleId])

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
      // Un seul bulletin généré : on l'affiche directement, pas besoin de cliquer à nouveau.
      if (data.length === 1) await ouvrirApercu(data[0].bulletinId)
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération des bulletins')
    } finally {
      setGeneration(false)
    }
  }

  const ouvrirApercu = async (bulletinId) => {
    setChargementApercu(true)
    setError('')
    setAfficherDiscipline(false)
    try {
      const data = await apiClient.getBulletinData(bulletinId)
      setBulletinAffiche(data)
      setFormDiscipline(champsDiscipline(data.bulletin))
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de l'aperçu")
    } finally {
      setChargementApercu(false)
    }
  }

  const enregistrerDiscipline = async () => {
    if (!bulletinAffiche) return
    setEnregistrementDiscipline(true)
    setError('')
    try {
      await apiClient.mettreAJourDisciplineBulletin(bulletinAffiche.bulletinId, formDiscipline)
      await ouvrirApercu(bulletinAffiche.bulletinId)
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setEnregistrementDiscipline(false)
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

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm space-y-1">
        <p>ℹ️ Le modèle reproduit le bulletin papier fourni par le client, avec les notes Eval1/Eval2 du bordereau, les moyennes, le rang, l'effectif,
        les groupes de matières (selon le « département » de chaque matière) et les absences/retards (d'après l'appel).</p>
        <p>La discipline et le conseil de classe (exclusion, TH/ENC/FEL..., observation) se saisissent dans l'aperçu du bulletin, bouton « Discipline et conseil de classe ».</p>
        <p>Le professeur principal se désigne dans « Programme de la classe » ci-dessous ; sans matière groupée par « département », toutes les matières apparaissent dans un seul groupe.</p>
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
            <select value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              {ANNEES_SCOLAIRES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
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

      {/* Programme de la classe sélectionnée : matières, enseignant, coefficient */}
      {classeId ? (
        <ProgrammeClasse
          key={classeId}
          classeId={classeId}
          ecoleId={ecoleId}
          peutModifier={peutModifierProgramme}
          onAjouterEnseignant={onNavigate && (() => onNavigate('create-personnel'))}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 text-sm text-slate-500">
          Sélectionnez une classe pour définir son programme (matières, enseignants et coefficients) et générer ses bulletins.
        </div>
      )}

      {/* Résultats */}
      {resultats && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-900 flex items-center justify-between">
            <span>Bulletins générés ({resultats.length})</span>
            <span className="text-xs font-normal text-slate-500">Cliquez sur "Voir le bulletin" pour l'aperçu et l'impression/PDF</span>
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
                    <span className="text-xs text-slate-600">{r.mentionGenerale}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); ouvrirApercu(r.bulletinId) }}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs font-medium flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Voir le bulletin
                    </button>
                    {detailOuvert[r.bulletinId] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {detailOuvert[r.bulletinId] && (
                  <div className="px-4 pb-4">
                    {!r.programmeDefini ? (
                      <p className="text-sm text-slate-500">Le programme de cette classe n'est pas défini : cochez ses matières dans « Programme de la classe » ci-dessus.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1">Matière</th>
                            <th className="py-1 text-center">Note</th>
                            <th className="py-1 text-center">Coefficient</th>
                            <th className="py-1">Mention</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.groupes.flatMap(g => g.lignes).map((n, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-1 text-slate-900">{n.matiere}</td>
                              <td className="py-1 text-center">{n.note === null ? '-' : `${n.note}/20`}</td>
                              <td className="py-1 text-center">{n.coefficient}</td>
                              <td className="py-1 text-slate-500">{n.mention || '-'}</td>
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

      {chargementApercu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-2 text-slate-600">
            <Loader className="w-5 h-5 animate-spin" /> Chargement de l'aperçu...
          </div>
        </div>
      )}

      {bulletinAffiche && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto py-6">
          <div className="max-w-4xl mx-auto">
            <div className="no-print flex justify-end gap-2 mb-3 px-2">
              <button
                onClick={() => setAfficherDiscipline(!afficherDiscipline)}
                className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" /> Discipline et conseil de classe
              </button>
              <button
                onClick={telechargerBulletinPdf}
                disabled={telechargementPdf}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> {telechargementPdf ? 'Génération...' : 'Télécharger en PDF'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
              <button
                onClick={() => setBulletinAffiche(null)}
                className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Fermer
              </button>
            </div>

            {afficherDiscipline && formDiscipline && (
              <div className="no-print bg-white rounded-lg shadow-2xl p-4 mb-3 text-sm space-y-3">
                <p className="text-xs text-slate-500">
                  Ces informations ne viennent d'aucune autre donnée de l'application (contrairement aux notes, à la moyenne et aux absences/retards,
                  calculés automatiquement) : elles sont à saisir ici pour chaque bulletin.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">Discipline</p>
                    <div className="space-y-1">
                      {CASES_DISCIPLINE.map(c => (
                        <label key={c.cle} className="flex items-center gap-2">
                          <input type="checkbox" checked={formDiscipline[c.cle]} onChange={(e) => setFormDiscipline({ ...formDiscipline, [c.cle]: e.target.checked })} />
                          {c.label}
                        </label>
                      ))}
                      <label className="flex items-center gap-2">
                        <span>Jours d'exclusion :</span>
                        <input type="number" min="0" value={formDiscipline.joursExclusion} onChange={(e) => setFormDiscipline({ ...formDiscipline, joursExclusion: e.target.value })} className="w-16 px-2 py-1 border border-slate-300 rounded" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">Décisions du conseil de classe</p>
                    <div className="grid grid-cols-1 gap-1">
                      {CASES_CONSEIL.map(c => (
                        <label key={c.cle} className="flex items-center gap-2">
                          <input type="checkbox" checked={formDiscipline[c.cle]} onChange={(e) => setFormDiscipline({ ...formDiscipline, [c.cle]: e.target.checked })} />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Observation du conseil</label>
                  <input
                    type="text"
                    value={formDiscipline.observationConseil}
                    onChange={(e) => setFormDiscipline({ ...formDiscipline, observationConseil: e.target.value })}
                    placeholder="Ex : Passable, doit redoubler d'efforts..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  onClick={enregistrerDiscipline}
                  disabled={enregistrementDiscipline}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {enregistrementDiscipline ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                </button>
              </div>
            )}

            <div id="bulletin-print-area" className="shadow-2xl">
              <BulletinTemplate data={bulletinAffiche} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
