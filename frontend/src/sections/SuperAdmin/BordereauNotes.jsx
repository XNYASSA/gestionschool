import { useState, useEffect, useMemo, useContext } from 'react'
import { ClipboardList, Loader, Save, Printer, AlertTriangle, ShieldCheck } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthContext } from '../../context/AuthContext'
import { ANNEE_SCOLAIRE_COURANTE, ANNEES_SCOLAIRES } from '../../utils/anneeScolaire'
import { mentionPourNote } from '../../utils/baremeNotation'
import { moyenneEleve, sectionBordereau, sectionFiche, libelleEvaluation } from '../../utils/impressionExamens'
import { nomFichierSur } from '../../utils/exportTableau'
import BoutonsExport from '../../components/BoutonsExport'

const texteNote = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','))
const versNombre = (t) => {
  const s = String(t ?? '').trim().replace(',', '.')
  return s === '' ? null : Number(s)
}
const noteInvalide = (t) => {
  const n = versNombre(t)
  return n !== null && (Number.isNaN(n) || n < 0 || n > 20)
}
const formatMoyenne = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function BordereauNotes({ onNavigate }) {
  const { user } = useContext(AuthContext)
  const peutRouvrir = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE'].includes(user?.roleAPI)
  const [validating, setValidating] = useState(false)
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [anneeScolaire, setAnneeScolaire] = useState(ANNEE_SCOLAIRE_COURANTE)
  const [trimestre, setTrimestre] = useState(1)
  const [evaluation, setEvaluation] = useState(1)

  const [donnees, setDonnees] = useState(null)
  const [saisies, setSaisies] = useState({})
  const [loading, setLoading] = useState(true)
  const [chargement, setChargement] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [ficheMatiere, setFicheMatiere] = useState('')
  const [optionFiche, setOptionFiche] = useState('nom')
  const [professeur, setProfesseur] = useState('')
  const [contenuBordereau, setContenuBordereau] = useState('notes')

  useEffect(() => {
    Promise.all([apiClient.getEcoles(), apiClient.getClasses()])
      .then(([ecolesData, classesData]) => {
        setEcoles(ecolesData)
        setClasses(classesData)
        if (ecolesData.length > 0) setEcoleId(ecolesData[0].id)
      })
      .catch(err => setError(err.message || 'Erreur lors du chargement des données'))
      .finally(() => setLoading(false))
  }, [])

  const classesEcole = useMemo(
    () => classes.filter(c => (c.ecoleId || c.ecole?.id) === ecoleId).sort((a, b) => a.nom.localeCompare(b.nom)),
    [classes, ecoleId]
  )

  useEffect(() => {
    if (classesEcole.length > 0 && !classesEcole.some(c => c.id === classeId)) setClasseId(classesEcole[0].id)
    if (classesEcole.length === 0) setClasseId('')
  }, [classesEcole])

  const notesInitiales = (data) => Object.fromEntries(data.eleves.map(e => [e.id, Object.fromEntries(Object.entries(e.notes).map(([m, v]) => [m, texteNote(v)]))]))

  useEffect(() => {
    if (!classeId) { setDonnees(null); return }
    let annule = false
    setChargement(true)
    setError('')
    setMessage('')
    apiClient.getBordereau({ classeId, anneeScolaire, trimestre, evaluation })
      .then(data => {
        if (annule) return
        setDonnees(data)
        setSaisies(notesInitiales(data))
        setFicheMatiere('')
      })
      .catch(err => { if (!annule) { setDonnees(null); setError(err.message || 'Erreur lors du chargement du bordereau') } })
      .finally(() => { if (!annule) setChargement(false) })
    return () => { annule = true }
  }, [classeId, anneeScolaire, trimestre, evaluation])

  const modifications = useMemo(() => {
    if (!donnees) return []
    const liste = []
    donnees.eleves.forEach(e => {
      donnees.matieres.forEach(m => {
        const avant = texteNote(e.notes[m.matiereId])
        const apres = (saisies[e.id]?.[m.matiereId] ?? '').trim()
        if (avant !== apres) liste.push({ eleveId: e.id, matiereId: m.matiereId, valeur: apres })
      })
    })
    return liste
  }, [donnees, saisies])

  const aDesErreurs = donnees ? donnees.eleves.some(e => Object.values(saisies[e.id] || {}).some(noteInvalide)) : false

  // Confirmation avant de perdre des saisies non enregistrées en changeant de filtre
  const changerFiltre = (appliquer) => {
    if (modifications.length > 0 && !confirm('Des notes saisies ne sont pas enregistrées. Changer de sélection les fera perdre. Continuer ?')) return
    appliquer()
  }

  const saisir = (eleveId, matiereId, valeur) => {
    setMessage('')
    setSaisies(prev => ({ ...prev, [eleveId]: { ...prev[eleveId], [matiereId]: valeur } }))
  }

  const naviguer = (e, ligne, colonne) => {
    const delta = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (delta === 0) return
    e.preventDefault()
    document.querySelector(`[data-ligne="${ligne + delta}"][data-colonne="${colonne}"]`)?.focus()
  }

  const parametres = () => ({ classeId, anneeScolaire, trimestre, evaluation })

  const rechargerDonnees = async () => {
    const data = await apiClient.getBordereau(parametres())
    setDonnees(data)
    setSaisies(notesInitiales(data))
  }

  // Valide les notes du bordereau : elles sont alors considérées comme contrôlées et utilisables pour les bulletins
  const validerNotes = async () => {
    if (!confirm(`Valider les ${donnees.validation.total - donnees.validation.valides} note(s) saisies de ${donnees.classe.nom} (${libelleEvaluation(trimestre, evaluation)}) ? Vérifiez d'abord qu'elles correspondent aux fiches remplies par les enseignants.`)) return
    setValidating(true)
    setError('')
    setMessage('')
    try {
      const res = await apiClient.validerBordereau(parametres())
      await rechargerDonnees()
      setMessage(`${res.validees} note(s) validée(s).`)
    } catch (err) {
      setError(err.message || 'Erreur lors de la validation')
    } finally {
      setValidating(false)
    }
  }

  const rouvrirNotes = async () => {
    if (!confirm('Remettre ces notes « à valider » pour pouvoir les corriger ?')) return
    setValidating(true)
    setError('')
    setMessage('')
    try {
      const res = await apiClient.rouvrirBordereau(parametres())
      await rechargerDonnees()
      setMessage(`${res.rouvertes} note(s) remise(s) à valider.`)
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setValidating(false)
    }
  }

  const enregistrer = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await apiClient.saveBordereau({ classeId, anneeScolaire, trimestre, evaluation, notes: modifications })
      const data = await apiClient.getBordereau({ classeId, anneeScolaire, trimestre, evaluation })
      setDonnees(data)
      setSaisies(notesInitiales(data))
      setMessage(`Notes enregistrées : ${res.enregistrees} saisie(s)${res.effacees ? `, ${res.effacees} effacée(s)` : ''}.`)
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  // Notes courantes (saisies à l'écran) sous forme numérique, pour moyennes, mentions et impressions
  const notesNumeriques = useMemo(() => {
    if (!donnees) return {}
    return Object.fromEntries(donnees.eleves.map(e => [e.id, Object.fromEntries(
      Object.entries(saisies[e.id] || {}).map(([m, t]) => [m, versNombre(t)]).filter(([, v]) => v !== null && !Number.isNaN(v))
    )]))
  }, [donnees, saisies])

  const moyennesMatieres = useMemo(() => {
    if (!donnees) return {}
    return Object.fromEntries(donnees.matieres.map(m => {
      const valeurs = donnees.eleves.map(e => notesNumeriques[e.id]?.[m.matiereId]).filter(v => v !== undefined)
      return [m.matiereId, valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : null]
    }))
  }, [donnees, notesNumeriques])

  const aucunCoefficient = donnees && donnees.matieres.length > 0 && donnees.matieres.every(m => m.coefficient === 0)

  const matiereFiche = donnees?.matieres.find(m => m.matiereId === ficheMatiere)
  useEffect(() => { setProfesseur(matiereFiche?.enseignant || '') }, [ficheMatiere, donnees])

  const nomBase = donnees ? nomFichierSur(`${donnees.classe.ecole}-${donnees.classe.nom}-T${trimestre}-E${evaluation}-${anneeScolaire}`) : ''

  const construireBordereau = (avecNotes) => () => ({
    sections: [sectionBordereau(donnees, { avecNotes, notesSaisies: notesNumeriques })],
    nomFichier: `bordereau-${avecNotes ? '' : 'vierge-'}${nomBase}`
  })

  const construireFiches = () => {
    const matieres = matiereFiche ? [matiereFiche] : donnees.matieres
    return {
      sections: matieres.map(m => sectionFiche(donnees, m, { professeur: matiereFiche ? professeur : m.enseignant, avecMatricule: optionFiche === 'matricule' })),
      nomFichier: `fiches-notes-${matiereFiche ? nomFichierSur(matiereFiche.abreviation) + '-' : ''}${nomBase}`
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  const selecteur = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <ClipboardList className="w-6 h-6 text-emerald-600" /> Bordereau des notes
      </h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      <div className="bg-white rounded-lg shadow-md p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ecoles.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">École</label>
            <select value={ecoleId} onChange={(e) => changerFiltre(() => setEcoleId(e.target.value))} className={selecteur}>
              {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Année</label>
          <select value={anneeScolaire} onChange={(e) => changerFiltre(() => setAnneeScolaire(e.target.value))} className={selecteur}>
            {ANNEES_SCOLAIRES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Division</label>
          <select value={trimestre} onChange={(e) => changerFiltre(() => setTrimestre(parseInt(e.target.value)))} className={selecteur}>
            {[1, 2, 3].map(t => <option key={t} value={t}>Trimestre {t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Période</label>
          <select value={evaluation} onChange={(e) => changerFiltre(() => setEvaluation(parseInt(e.target.value)))} className={selecteur}>
            {[1, 2].map(n => <option key={n} value={n}>Évaluation {n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
          <select value={classeId} onChange={(e) => changerFiltre(() => setClasseId(e.target.value))} className={selecteur}>
            {classesEcole.length === 0 && <option value="">Aucune classe</option>}
            {classesEcole.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      {chargement && (
        <div className="p-6 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement du bordereau...
        </div>
      )}

      {donnees && !chargement && donnees.matieres.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Le programme de la classe {donnees.classe.nom} n'est pas défini : aucune matière à afficher.
          {onNavigate && <button onClick={() => onNavigate('bulletins')} className="ml-2 underline font-medium">Définir le programme (Bulletins → Programme de la classe)</button>}
        </div>
      )}

      {donnees && !chargement && donnees.matieres.length > 0 && (
        <>
          {aucunCoefficient && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              Aucun coefficient n'est défini pour cette classe : les moyennes affichées sont des moyennes simples.
              {onNavigate && <button onClick={() => onNavigate('bulletins')} className="underline font-medium">Définir les coefficients</button>}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{donnees.classe.nom} — {libelleEvaluation(trimestre, evaluation)} — {anneeScolaire}</h3>
                <p className="text-xs text-slate-500">{donnees.eleves.length} élève(s) · notes saisies sur 20 · Entrée ou ↓ pour passer à l'élève suivant</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {donnees.validation.total > 0 && (
                  donnees.validation.valides === donnees.validation.total
                    ? <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Notes validées ({donnees.validation.total})</span>
                    : <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800">⚠ {donnees.validation.total - donnees.validation.valides} note(s) à valider sur {donnees.validation.total}</span>
                )}
                {donnees.validation.total - donnees.validation.valides > 0 && (
                  <button
                    onClick={validerNotes}
                    disabled={validating || modifications.length > 0}
                    title={modifications.length > 0 ? "Enregistrez d'abord les notes saisies" : ''}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {validating ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Valider les notes
                  </button>
                )}
                {peutRouvrir && donnees.validation.total > 0 && donnees.validation.valides > 0 && (
                  <button onClick={rouvrirNotes} disabled={validating} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm">Rouvrir pour correction</button>
                )}
                <BoutonsExport construire={construireBordereau(true)} disabled={donnees.eleves.length === 0} />
                <button
                  onClick={enregistrer}
                  disabled={saving || modifications.length === 0 || aDesErreurs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer les notes{modifications.length > 0 ? ` (${modifications.length})` : ''}
                </button>
              </div>
            </div>
            {aDesErreurs && <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">Une note saisie est invalide (entre 0 et 20 attendu) : corrigez les cases en rouge.</div>}

            {donnees.eleves.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucun élève dans cette classe</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse">
                  <thead>
                    <tr className="bg-emerald-600 text-white">
                      <th className="px-2 py-2 text-center font-semibold w-10">N°</th>
                      <th className="px-3 py-2 text-left font-semibold min-w-[240px] sticky left-0 bg-emerald-600 z-10">Noms</th>
                      {donnees.matieres.map(m => (
                        <th key={m.matiereId} className="px-1 py-2 text-center font-semibold min-w-[72px]" title={m.nom}>
                          {m.abreviation}
                          <div className="text-[10px] font-normal opacity-80">coef {m.coefficient}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-semibold min-w-[72px]">Moy.</th>
                      <th className="px-3 py-2 text-left font-semibold min-w-[120px]">Mention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donnees.eleves.map((eleve, ligne) => {
                      const moyenne = moyenneEleve(notesNumeriques[eleve.id] || {}, donnees.matieres)
                      const mention = moyenne !== null ? mentionPourNote(donnees.bareme.lignes, moyenne) : null
                      return (
                        <tr key={eleve.id} className="border-b border-slate-200 hover:bg-emerald-50/40">
                          <td className="px-2 py-1 text-center text-slate-400 text-xs">{ligne + 1}</td>
                          <td className="px-3 py-1 text-slate-900 whitespace-nowrap sticky left-0 bg-white z-10">{eleve.nom} {eleve.prenom}</td>
                          {donnees.matieres.map((m, colonne) => {
                            const texte = saisies[eleve.id]?.[m.matiereId] ?? ''
                            const invalide = noteInvalide(texte)
                            const faible = !invalide && versNombre(texte) !== null && versNombre(texte) < 10
                            const modifiee = texte.trim() !== texteNote(eleve.notes[m.matiereId])
                            return (
                              <td key={m.matiereId} className="p-0.5 border-l border-slate-100">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  data-ligne={ligne}
                                  data-colonne={colonne}
                                  value={texte}
                                  onChange={(e) => saisir(eleve.id, m.matiereId, e.target.value)}
                                  onKeyDown={(e) => naviguer(e, ligne, colonne)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full px-1 py-1 text-center font-mono border rounded focus:ring-2 focus:ring-emerald-400 focus:outline-none ${
                                    invalide ? 'border-red-500 bg-red-50 text-red-700' : faible ? 'text-red-600 border-transparent' : 'border-transparent'
                                  } ${modifiee && !invalide ? 'bg-yellow-50' : ''}`}
                                />
                              </td>
                            )
                          })}
                          <td className="px-3 py-1 text-center font-mono font-semibold">
                            {moyenne !== null ? <span className={moyenne < 10 ? 'text-red-600' : 'text-slate-900'}>{formatMoyenne(moyenne)}</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-1 text-slate-700 whitespace-nowrap" title={mention?.mentionEn || ''}>
                            {mention ? <>{mention.mentionFr}{mention.apc && <span className="ml-1 text-xs text-slate-400">({mention.apc})</span>}</> : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-700">
                      <td />
                      <td className="px-3 py-2 sticky left-0 bg-slate-50 z-10">Moyenne de la classe</td>
                      {donnees.matieres.map(m => (
                        <td key={m.matiereId} className="px-1 py-2 text-center font-mono text-xs">{moyennesMatieres[m.matiereId] !== null ? formatMoyenne(moyennesMatieres[m.matiereId]) : '—'}</td>
                      ))}
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Printer className="w-4 h-4 text-blue-600" /> Bordereau de la classe</h3>
              <select value={contenuBordereau} onChange={(e) => setContenuBordereau(e.target.value)} className={selecteur}>
                <option value="notes">Avec les notes saisies</option>
                <option value="vierge">Vierge (cases vides à remplir à la main)</option>
              </select>
              <BoutonsExport construire={construireBordereau(contenuBordereau === 'notes')} disabled={donnees.eleves.length === 0} />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Printer className="w-4 h-4 text-blue-600" /> Fiches de notes pour les enseignants</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Matière</label>
                  <select value={ficheMatiere} onChange={(e) => setFicheMatiere(e.target.value)} className={selecteur}>
                    <option value="">Toutes les matières (une fiche par page)</option>
                    {donnees.matieres.map(m => <option key={m.matiereId} value={m.matiereId}>{m.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Option d'impression</label>
                  <select value={optionFiche} onChange={(e) => setOptionFiche(e.target.value)} className={selecteur}>
                    <option value="nom">Nom seulement</option>
                    <option value="matricule">Matricule et nom</option>
                  </select>
                </div>
              </div>
              {matiereFiche && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Professeur</label>
                  <input type="text" value={professeur} onChange={(e) => setProfesseur(e.target.value)} placeholder="Nom de l'enseignant (facultatif)" className={selecteur} />
                </div>
              )}
              <BoutonsExport construire={construireFiches} disabled={donnees.eleves.length === 0} excel={false} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
