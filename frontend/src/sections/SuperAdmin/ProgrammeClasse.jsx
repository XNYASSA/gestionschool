import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Loader, Search, Save, Lock } from 'lucide-react'
import { apiClient } from '../../api/client'

function versEtat(matieres) {
  return Object.fromEntries(matieres.map(m => [m.matiereId, {
    inclus: m.inclus,
    coefficient: String(m.coefficient),
    enseignantUtilisateurId: m.enseignantUtilisateurId || ''
  }]))
}

export default function ProgrammeClasse({ classeId, ecoleId, peutModifier }) {
  const [programme, setProgramme] = useState(null)
  const [enseignants, setEnseignants] = useState([])
  const [etat, setEtat] = useState({})
  const [recherche, setRecherche] = useState('')
  const [seulementCochees, setSeulementCochees] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let annule = false
    const charger = async () => {
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const [prog, employes] = await Promise.all([
          apiClient.getProgrammeClasse(classeId),
          apiClient.getEmployesEcole(ecoleId).catch(() => [])
        ])
        if (annule) return
        setProgramme(prog)
        setEtat(versEtat(prog.matieres))
        setEnseignants(employes.filter(e => e.role === 'ENSEIGNANT'))
      } catch (err) {
        if (!annule) setError(err.message || 'Erreur lors du chargement du programme de la classe')
      } finally {
        if (!annule) setLoading(false)
      }
    }
    charger()
    return () => { annule = true }
  }, [classeId, ecoleId])

  const modifier = (matiereId, changements) => {
    setMessage('')
    setEtat(prev => ({ ...prev, [matiereId]: { ...prev[matiereId], ...changements } }))
  }

  const matieresAffichees = useMemo(() => {
    if (!programme) return []
    const terme = recherche.trim().toLowerCase()
    return programme.matieres.filter(m => {
      if (seulementCochees && !etat[m.matiereId]?.inclus) return false
      if (!terme) return true
      return m.nom.toLowerCase().includes(terme) || m.abreviation?.toLowerCase().includes(terme)
    })
  }, [programme, recherche, seulementCochees, etat])

  const nbCochees = Object.values(etat).filter(l => l.inclus).length
  const totalCoefficients = Object.values(etat)
    .filter(l => l.inclus)
    .reduce((somme, l) => somme + (parseInt(l.coefficient) || 0), 0)

  const enregistrer = async () => {
    setError('')
    setMessage('')

    const cochees = programme.matieres.filter(m => etat[m.matiereId]?.inclus)
    const invalide = cochees.find(m => {
      const c = etat[m.matiereId].coefficient
      return c === '' || !/^\d+$/.test(c) || parseInt(c) > 100
    })
    if (invalide) {
      setError(`Coefficient invalide pour « ${invalide.nom} » : saisissez un entier de 0 à 100 (0 si la matière ne compte pas).`)
      return
    }

    setSaving(true)
    try {
      const donnees = await apiClient.saveProgrammeClasse(
        classeId,
        cochees.map(m => ({
          matiereId: m.matiereId,
          coefficient: parseInt(etat[m.matiereId].coefficient),
          enseignantUtilisateurId: etat[m.matiereId].enseignantUtilisateurId || null
        }))
      )
      setProgramme(donnees)
      setEtat(versEtat(donnees.matieres))
      setMessage(`Programme de la classe « ${donnees.classe.nom} » enregistré : ${donnees.matieres.filter(m => m.inclus).length} matière(s), total des coefficients ${donnees.totalCoefficients}.`)
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement du programme")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center text-slate-500 flex items-center justify-center gap-2">
        <Loader className="w-5 h-5 animate-spin" /> Chargement du programme de la classe...
      </div>
    )
  }

  if (!programme) {
    return error ? <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div> : null
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-500" /> Programme de la classe {programme.classe.nom}
          <span className="text-xs font-normal text-slate-500">({programme.classe.ecoleNom})</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Cochez les matières enseignées dans cette classe, choisissez l'enseignant et le coefficient. Le bulletin de chaque élève utilise ce programme.
        </p>
      </div>

      {error && <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">⚠️ {error}</div>}
      {message && <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">✅ {message}</div>}

      {programme.matieres.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">Aucune matière définie pour cette école : le programme ne peut pas être établi.</p>
      ) : (
        <>
          <div className="p-4 flex flex-wrap items-center gap-4 border-b border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une matière..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={seulementCochees} onChange={(e) => setSeulementCochees(e.target.checked)} className="w-4 h-4" />
              Voir seulement les matières cochées
            </label>
          </div>

          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2 w-10"></th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Matière</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Enseignant</th>
                  <th className="px-4 py-2 text-center font-semibold text-slate-700 w-28">Coefficient</th>
                </tr>
              </thead>
              <tbody>
                {matieresAffichees.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Aucune matière ne correspond</td></tr>
                ) : (
                  matieresAffichees.map(m => {
                    const ligne = etat[m.matiereId]
                    const inclus = ligne.inclus
                    return (
                      <tr key={m.matiereId} className={`border-b border-slate-100 ${inclus ? 'bg-white' : 'bg-slate-50/60 text-slate-400'}`}>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={inclus}
                            disabled={!peutModifier || (inclus && m.verrouille)}
                            onChange={(e) => modifier(m.matiereId, { inclus: e.target.checked })}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <span className={inclus ? 'text-slate-900' : ''}>{m.nom}</span>
                          {m.abreviation && <span className="ml-2 text-xs text-slate-400">{m.abreviation}</span>}
                          {m.verrouille && (
                            <span className="ml-2 text-xs text-amber-600 inline-flex items-center gap-1" title="Des notes ou des leçons sont déjà saisies pour cette matière">
                              <Lock className="w-3 h-3" /> notes/leçons saisies
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={ligne.enseignantUtilisateurId}
                            disabled={!peutModifier || !inclus || m.verrouille}
                            onChange={(e) => modifier(m.matiereId, { enseignantUtilisateurId: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg disabled:bg-slate-100"
                          >
                            <option value="">--- Aucun professeur ---</option>
                            {enseignants.map(ens => <option key={ens.utilisateurId} value={ens.utilisateurId}>{ens.nom}</option>)}
                            {ligne.enseignantUtilisateurId && !enseignants.some(ens => ens.utilisateurId === ligne.enseignantUtilisateurId) && (
                              <option value={ligne.enseignantUtilisateurId}>{m.enseignantNom}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={ligne.coefficient}
                            disabled={!peutModifier || !inclus}
                            onChange={(e) => modifier(m.matiereId, { coefficient: e.target.value })}
                            className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center disabled:bg-slate-100"
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{nbCochees}</span> matière{nbCochees > 1 ? 's' : ''} cochée{nbCochees > 1 ? 's' : ''} —
              total des coefficients : <span className="font-bold text-purple-700">{totalCoefficients}</span>
            </div>
            {peutModifier ? (
              <button
                onClick={enregistrer}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer le programme'}
              </button>
            ) : (
              <span className="text-xs text-slate-500">Consultation seule : seul le Principal ou la Directrice peut modifier le programme.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
