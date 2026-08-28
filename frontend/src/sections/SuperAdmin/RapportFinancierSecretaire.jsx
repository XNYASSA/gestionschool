import { useState, useEffect, useMemo } from 'react'
import { Wallet, TrendingUp, Loader, Calendar, Check, Users } from 'lucide-react'
import { apiClient } from '../../api/client'
import { isInPeriod, PERIOD_LABELS } from '../../utils/periodFilter'
import { getStatutPaiement, STATUT_PAIEMENT_STYLE } from '../../utils/statutPaiement'

const todayISO = () => new Date().toISOString().split('T')[0]
const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

const MODES_PAIEMENT = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' }
]

export default function RapportFinancierSecretaire() {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [eleves, setEleves] = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({ eleveId: '', montant: '', modePayement: 'ESPECES' })
  const [saving, setSaving] = useState(false)

  const [period, setPeriod] = useState('jour')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  useEffect(() => {
    loadEcoles()
  }, [])

  useEffect(() => {
    if (ecoleId) loadDonneesEcole()
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

  const loadDonneesEcole = async () => {
    setError('')
    try {
      const [elevesData, paiementsData] = await Promise.all([
        apiClient.getEleves(),
        apiClient.getPaiements()
      ])
      setEleves(elevesData.filter(e => e.classe?.ecoleId === ecoleId))
      setPaiements(paiementsData.filter(p => p.eleve?.classe?.ecoleId === ecoleId))
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.eleveId || !form.montant) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await apiClient.enregistrerPaiement(form.eleveId, parseInt(form.montant), form.modePayement)
      setMessage('Paiement enregistré avec succès.')
      setForm({ eleveId: '', montant: '', modePayement: 'ESPECES' })
      await loadDonneesEcole()
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement du paiement")
    } finally {
      setSaving(false)
    }
  }

  const referenceDate = new Date(selectedDate + 'T12:00:00')
  const paiementsPeriode = useMemo(
    () => paiements.filter(p => isInPeriod(p.date, period, referenceDate)),
    [paiements, period, selectedDate]
  )
  const inscriptions = paiementsPeriode.filter(p => p.tranche === 'inscription').reduce((sum, p) => sum + p.montant, 0)
  const pensions = paiementsPeriode.filter(p => p.tranche !== 'inscription').reduce((sum, p) => sum + p.montant, 0)
  const total = inscriptions + pensions
  const dateLabel = referenceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Regroupement par élève : montant total versé pendant la période
  const elevesAyantPaye = useMemo(() => {
    const map = new Map()
    paiementsPeriode.forEach(p => {
      if (!p.eleve) return
      const existant = map.get(p.eleveId) || { eleve: p.eleve, total: 0, operations: 0 }
      existant.total += p.montant
      existant.operations += 1
      map.set(p.eleveId, existant)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [paiementsPeriode])

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

      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Établissement</label>
        <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg">
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
      </div>

      {/* Formulaire d'entrée d'argent */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Enregistrer une entrée d'argent (inscription ou tranche de pension)</h3>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Élève</label>
            <select
              value={form.eleveId}
              onChange={(e) => setForm({ ...form, eleveId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            >
              <option value="">Sélectionner un élève</option>
              {eleves.map(el => (
                <option key={el.id} value={el.id}>{el.nom} {el.prenom} — {el.classe?.nom} ({el.matricule})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA)</label>
            <input
              type="number"
              min="0"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ex: 50000"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
            <select
              value={form.modePayement}
              onChange={(e) => setForm({ ...form, modePayement: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {MODES_PAIEMENT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-4">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
              {saving ? 'Enregistrement...' : <><Check className="w-4 h-4" /> Enregistrer le paiement</>}
            </button>
          </div>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          Le montant est automatiquement appliqué à la prochaine échéance non soldée de l'élève (inscription, puis tranches).
        </p>
      </div>

      {/* Résumé par période */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" /> Consulter à la date du :
          </label>
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <div className="flex gap-2 ml-auto">
            {['jour', 'semaine', 'mois'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg transition ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Total des opérations pour <strong>{PERIOD_LABELS[period]?.toLowerCase()}</strong> — ancré sur le <strong>{dateLabel}</strong>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">Frais d'inscription</p>
            <p className="text-xl font-bold text-slate-900">{formatFCFA(inscriptions)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">Tranches de pension</p>
            <p className="text-xl font-bold text-slate-900">{formatFCFA(pensions)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-slate-600">Total encaissé</p>
            <p className="text-xl font-bold text-green-700">{formatFCFA(total)}</p>
          </div>
        </div>
      </div>

      {/* Liste des élèves ayant réalisé un versement sur la période */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900">
            Élèves ayant versé un paiement — {elevesAyantPaye.length} élève{elevesAyantPaye.length > 1 ? 's' : ''}
          </h3>
        </div>
        {elevesAyantPaye.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun versement pour cette période</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Élève</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Classe</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant versé (période)</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Statut global</th>
                </tr>
              </thead>
              <tbody>
                {elevesAyantPaye.map(({ eleve, total: montantPeriode }) => {
                  const eleveComplet = eleves.find(e => e.id === eleve.id) || eleve
                  const statut = STATUT_PAIEMENT_STYLE[getStatutPaiement(eleveComplet)]
                  return (
                    <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-900">{eleve.nom} {eleve.prenom} <span className="text-xs text-slate-400">({eleve.matricule})</span></td>
                      <td className="px-6 py-3 text-slate-600">{eleve.classe?.nom || '-'}</td>
                      <td className="px-6 py-3 text-center font-semibold text-slate-900">{formatFCFA(montantPeriode)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statut.className}`}>{statut.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
