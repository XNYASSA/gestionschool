import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Plus, Loader, Check } from 'lucide-react'
import { apiClient } from '../../api/client'

const todayISO = () => new Date().toISOString().split('T')[0]
const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

export default function RapportFinancierForm() {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [inscriptions, setInscriptions] = useState('')
  const [pensions, setPensions] = useState('')

  const [masseSalariale, setMasseSalariale] = useState({ total: 0, utilisateurs: [] })
  const [enseignants, setEnseignants] = useState([])
  const [heuresParEnseignant, setHeuresParEnseignant] = useState({})

  const [depensesVariables, setDepensesVariables] = useState([])
  const [showDepenseForm, setShowDepenseForm] = useState(false)
  const [depenseForm, setDepenseForm] = useState({ description: '', categorie: 'AUTRE', montant: '' })

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEcoles()
  }, [])

  useEffect(() => {
    if (ecoleId) loadDonneesEcole(ecoleId)
  }, [ecoleId])

  const loadEcoles = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getEcoles()
      setEcoles(data)
      if (data.length > 0) setEcoleId(data[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    } finally {
      setLoading(false)
    }
  }

  const loadDonneesEcole = async (id) => {
    setError('')
    try {
      const [salariale, enseignantsData] = await Promise.all([
        apiClient.getMasseSalariale(id),
        apiClient.getEnseignantsHoraires(id)
      ])
      setMasseSalariale(salariale)
      setEnseignants(enseignantsData)
      setHeuresParEnseignant({})
      setDepensesVariables([])
      setInscriptions('')
      setPensions('')
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des données de l'école")
    }
  }

  const totalEntrees = (parseInt(inscriptions) || 0) + (parseInt(pensions) || 0)

  const totalHeuresEnseignants = enseignants.reduce((sum, e) => {
    const heures = parseFloat(heuresParEnseignant[e.utilisateurId]) || 0
    return sum + heures * e.tarifHoraire
  }, 0)

  const totalDepensesVariables = depensesVariables.reduce((sum, d) => sum + d.montant, 0)
  const totalSorties = masseSalariale.total + totalHeuresEnseignants + totalDepensesVariables

  const handleDeclarerDepense = async (e) => {
    e.preventDefault()
    if (!depenseForm.description || !depenseForm.montant) return

    try {
      const depense = await apiClient.createDepense({
        description: depenseForm.description,
        categorie: depenseForm.categorie,
        type: 'VARIABLE',
        montant: parseInt(depenseForm.montant),
        dateDepense: date,
        ecoleId
      })
      setDepensesVariables([...depensesVariables, depense])
      setDepenseForm({ description: '', categorie: 'AUTRE', montant: '' })
      setShowDepenseForm(false)
    } catch (err) {
      setError(err.message || "Erreur lors de la déclaration de la dépense")
    }
  }

  const handleEnregistrerRapport = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await apiClient.creerSaisieQuotidienne(ecoleId, {
        date,
        type: 'FRAIS_COLLECTES',
        donnees: {
          inscriptions: parseInt(inscriptions) || 0,
          pensions: parseInt(pensions) || 0,
          montantTotal: totalEntrees
        }
      })

      await apiClient.creerSaisieQuotidienne(ecoleId, {
        date,
        type: 'DEPENSES_VERIFIEES',
        donnees: {
          chargeSalarialeAuto: masseSalariale.total,
          heuresEnseignants: enseignants
            .filter(e => parseFloat(heuresParEnseignant[e.utilisateurId]) > 0)
            .map(e => ({
              enseignantId: e.utilisateurId,
              nom: e.nom,
              heures: parseFloat(heuresParEnseignant[e.utilisateurId]),
              tarifHoraire: e.tarifHoraire,
              montant: parseFloat(heuresParEnseignant[e.utilisateurId]) * e.tarifHoraire
            })),
          totalHeuresEnseignants,
          depensesVariablesDeclarees: depensesVariables.map(d => ({ description: d.description, montant: d.montant })),
          montantTotal: totalSorties
        }
      })

      setMessage('Rapport financier enregistré avec succès.')
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement du rapport")
    } finally {
      setSaving(false)
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
        <Wallet className="w-6 h-6 text-blue-600" /> Rapport financier
      </h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-4">
        <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg">
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
        <label className="text-sm font-medium text-slate-700">Date :</label>
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" />
      </div>

      {/* Entrées */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Entrées d'argent</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frais d'inscription (FCFA)</label>
            <input type="number" min="0" value={inscriptions} onChange={(e) => setInscriptions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: 500000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tranche de pension scolaire (FCFA)</label>
            <input type="number" min="0" value={pensions} onChange={(e) => setPensions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: 1200000" />
          </div>
        </div>
        <div className="border-t border-slate-200 mt-4 pt-3 text-right font-bold text-lg">
          Total entrées : <span className="text-green-600">{formatFCFA(totalEntrees)}</span>
        </div>
      </div>

      {/* Sorties */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-bold text-slate-900">Sorties d'argent</h3>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg mb-4">
          <span className="text-sm text-slate-700">Charge salariale (personnel actif, calculée automatiquement)</span>
          <span className="font-bold text-slate-900">{formatFCFA(masseSalariale.total)}</span>
        </div>

        {enseignants.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Heures faites — enseignants payés à l'heure</h4>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {enseignants.map(ens => {
                const heures = heuresParEnseignant[ens.utilisateurId] || ''
                const montant = (parseFloat(heures) || 0) * ens.tarifHoraire
                return (
                  <div key={ens.utilisateurId} className="flex items-center gap-3 p-3">
                    <span className="flex-1 text-sm text-slate-900">{ens.nom}</span>
                    <span className="text-xs text-slate-500">{formatFCFA(ens.tarifHoraire)}/h</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={heures}
                      onChange={(e) => setHeuresParEnseignant({ ...heuresParEnseignant, [ens.utilisateurId]: e.target.value })}
                      placeholder="Heures faites"
                      className="w-28 px-2 py-1 border border-slate-300 rounded-lg text-center"
                    />
                    <span className="w-32 text-right text-sm font-semibold text-slate-700">{formatFCFA(montant)}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-right text-sm font-semibold text-slate-700 mt-2">
              Total heures enseignants : {formatFCFA(totalHeuresEnseignants)}
            </p>
          </div>
        )}

        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700">Dépenses variables déclarées</h4>
            <button
              onClick={() => setShowDepenseForm(!showDepenseForm)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Déclarer une dépense
            </button>
          </div>

          {showDepenseForm && (
            <form onSubmit={handleDeclarerDepense} className="bg-slate-50 rounded-lg p-4 space-y-3 mb-3">
              <input
                type="text"
                value={depenseForm.description}
                onChange={(e) => setDepenseForm({ ...depenseForm, description: e.target.value })}
                placeholder="Description (ex: Achat de craies)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
              <div className="flex gap-3">
                <select
                  value={depenseForm.categorie}
                  onChange={(e) => setDepenseForm({ ...depenseForm, categorie: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {['MATERIEL', 'FOURNITURES', 'MAINTENANCE', 'ENERGIE', 'AUTRE'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  value={depenseForm.montant}
                  onChange={(e) => setDepenseForm({ ...depenseForm, montant: e.target.value })}
                  placeholder="Montant (FCFA)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
                <button type="submit" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition">
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {depensesVariables.length > 0 && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {depensesVariables.map(d => (
                <div key={d.id} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-slate-900">{d.description} <span className="text-slate-400">({d.categorie})</span></span>
                  <span className="font-medium text-slate-700">{formatFCFA(d.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 mt-4 pt-3 text-right font-bold text-lg">
          Total sorties : <span className="text-red-600">{formatFCFA(totalSorties)}</span>
        </div>
      </div>

      <button
        onClick={handleEnregistrerRapport}
        disabled={saving || !ecoleId}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? 'Enregistrement...' : <><Check className="w-5 h-5" /> Enregistrer le rapport</>}
      </button>
    </div>
  )
}
