import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Loader } from 'lucide-react'
import { apiClient } from '../../api/client'
import { isInPeriod } from '../../utils/periodFilter'

const TRANCHE_LABELS = {
  inscription: "Frais d'inscription",
  tranche1: 'Tranche 1',
  tranche2: 'Tranche 2',
  tranche3: 'Tranche 3'
}

export default function ViewAnalytics() {
  const [frais, setFrais] = useState([])
  const [depenses, setDepenses] = useState([])
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [personnel, setPersonnel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [period, setPeriod] = useState('mois')
  const [filterEcole, setFilterEcole] = useState('')
  const [filterClasse, setFilterClasse] = useState('')
  const [searchEleve, setSearchEleve] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [fraisData, depensesData, ecolesData, classesData, utilisateursData] = await Promise.all([
        apiClient.getFrais(),
        apiClient.getDepenses(),
        apiClient.getEcoles(),
        apiClient.getClasses(),
        apiClient.getUtilisateurs()
      ])
      setFrais(fraisData)
      setDepenses(depensesData)
      setEcoles(ecolesData)
      setClasses(classesData)
      setPersonnel(utilisateursData.filter(u => u.actif && u.salaireMensuel))
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données analytiques')
    } finally {
      setLoading(false)
    }
  }

  const classesFiltrees = useMemo(() => {
    if (!filterEcole) return classes
    return classes.filter(c => c.ecoleId === filterEcole)
  }, [classes, filterEcole])

  // ENTRÉES : paiements des frais élèves
  const fraisFiltres = useMemo(() => {
    return frais.filter(f => {
      if (f.montantPaye <= 0) return false
      if (!isInPeriod(f.datePayement || f.createdAt, period)) return false
      const ecoleId = f.eleve?.classe?.ecole?.id || f.eleve?.classe?.ecoleId
      if (filterEcole && ecoleId !== filterEcole) return false
      if (filterClasse && f.eleve?.classeId !== filterClasse) return false
      if (searchEleve) {
        const term = searchEleve.toLowerCase()
        const nomComplet = `${f.eleve?.prenom} ${f.eleve?.nom}`.toLowerCase()
        if (!nomComplet.includes(term)) return false
      }
      return true
    })
  }, [frais, period, filterEcole, filterClasse, searchEleve])

  const totalEntrees = fraisFiltres.reduce((sum, f) => sum + f.montantPaye, 0)

  const entreesParTranche = useMemo(() => {
    const map = {}
    fraisFiltres.forEach(f => {
      map[f.tranche] = (map[f.tranche] || 0) + f.montantPaye
    })
    return map
  }, [fraisFiltres])

  // SORTIES : dépenses (fixes + variables)
  const depensesFiltrees = useMemo(() => {
    return depenses.filter(d => {
      if (!isInPeriod(d.dateDepense, period)) return false
      if (filterEcole && d.ecoleId !== filterEcole) return false
      return true
    })
  }, [depenses, period, filterEcole])

  // Salaires : montant mensuel actuel du personnel actif, indépendant de la période
  // (une rémunération n'est pas une transaction ponctuelle datée)
  const personnelFiltre = useMemo(() => {
    if (!filterEcole) return personnel
    return personnel.filter(p => p.utilisateurEcoles?.some(ue => ue.ecole.id === filterEcole))
  }, [personnel, filterEcole])
  const totalSalaires = personnelFiltre.reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)

  const totalFixes = depensesFiltrees.filter(d => d.type === 'FIXE').reduce((sum, d) => sum + d.montant, 0)
  const totalVariables = depensesFiltrees.filter(d => d.type === 'VARIABLE').reduce((sum, d) => sum + d.montant, 0)
  const totalSorties = totalSalaires + totalFixes + totalVariables

  const resultatNet = totalEntrees - totalSorties
  const formatFCFA = (m) => `${m.toLocaleString('fr-FR')} FCFA`

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">💰 Revenus & Dépenses</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Période */}
      <div className="flex gap-2">
        {['jour', 'semaine', 'mois'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg transition ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p === 'jour' ? "Aujourd'hui" : p === 'semaine' ? 'Cette semaine' : 'Ce mois'}
          </button>
        ))}
      </div>

      {/* Filtres croisés */}
      <div className="bg-white rounded-lg shadow-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          value={filterEcole}
          onChange={(e) => { setFilterEcole(e.target.value); setFilterClasse('') }}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">Toutes les écoles</option>
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
        <select
          value={filterClasse}
          onChange={(e) => setFilterClasse(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">Toutes les classes</option>
          {classesFiltrees.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <input
          type="text"
          placeholder="Rechercher par nom d'élève..."
          value={searchEleve}
          onChange={(e) => setSearchEleve(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entrées d'argent */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-slate-900">Entrées d'argent</h3>
              </div>
              <div className="space-y-3">
                {Object.keys(entreesParTranche).length === 0 ? (
                  <p className="text-slate-500 text-sm">Aucune entrée sur cette période</p>
                ) : (
                  Object.entries(entreesParTranche).map(([tranche, montant]) => (
                    <div key={tranche} className="flex justify-between text-sm border-b pb-2">
                      <span className="text-slate-600">{TRANCHE_LABELS[tranche] || tranche}</span>
                      <span className="font-semibold text-green-600">{formatFCFA(montant)}</span>
                    </div>
                  ))
                )}
                <div className="border-t border-slate-200 pt-3 font-bold text-lg flex justify-between">
                  <span>Total :</span>
                  <span className="text-green-600">{formatFCFA(totalEntrees)}</span>
                </div>
              </div>
            </div>

            {/* Sorties d'argent */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-slate-900">Sorties d'argent</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm border-b pb-2">
                  <span className="text-slate-600">Salaires (personnel actif)</span>
                  <span className="font-semibold text-red-600">{formatFCFA(totalSalaires)}</span>
                </div>
                <div className="flex justify-between text-sm border-b pb-2">
                  <span className="text-slate-600">Autres charges fixes</span>
                  <span className="font-semibold text-red-600">{formatFCFA(totalFixes)}</span>
                </div>
                <div className="flex justify-between text-sm border-b pb-2">
                  <span className="text-slate-600">Charges variables (matériel...)</span>
                  <span className="font-semibold text-red-600">{formatFCFA(totalVariables)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 font-bold text-lg flex justify-between">
                  <span>Total :</span>
                  <span className="text-red-600">{formatFCFA(totalSorties)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Résultat net */}
          <div className={`rounded-lg shadow-md p-6 text-white bg-gradient-to-r ${
            resultatNet >= 0 ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'
          }`}>
            <h3 className="text-lg font-bold mb-2">Résultat net ({period === 'jour' ? "aujourd'hui" : period === 'semaine' ? 'cette semaine' : 'ce mois'})</h3>
            <p className="text-2xl md:text-4xl font-bold break-words">{resultatNet >= 0 ? '+' : ''}{formatFCFA(resultatNet)}</p>
            <p className="text-sm text-white/80 mt-2">Entrées - Sorties</p>
          </div>
        </>
      )}
    </div>
  )
}
