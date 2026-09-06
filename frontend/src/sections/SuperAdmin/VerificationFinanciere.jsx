import { useState, useEffect, useMemo } from 'react'
import { Wallet, Loader, Calendar, Check } from 'lucide-react'
import { apiClient } from '../../api/client'
import { isInPeriod, PERIOD_LABELS } from '../../utils/periodFilter'
import RechercheEleve from '../../components/RechercheEleve'

const todayISO = () => new Date().toISOString().split('T')[0]
const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

export default function VerificationFinanciere() {
  const [paiements, setPaiements] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [eleveSelectionne, setEleveSelectionne] = useState(null)
  const [montant, setMontant] = useState('')
  const [saving, setSaving] = useState(false)

  const [period, setPeriod] = useState('jour')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  useEffect(() => {
    loadDonnees()
  }, [])

  const loadDonnees = async () => {
    setLoading(true)
    setError('')
    try {
      const [paiementsData, verificationsData] = await Promise.all([
        apiClient.getPaiements(),
        apiClient.getVerificationsPaiement()
      ])
      setPaiements(paiementsData)
      setVerifications(verificationsData)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEleve = (eleve) => {
    setEleveSelectionne(eleve)
    setMontant('')
    setMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!eleveSelectionne || !montant || parseInt(montant) <= 0) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await apiClient.enregistrerVerificationPaiement(eleveSelectionne.id, parseInt(montant))
      setMessage('Vérification enregistrée avec succès.')
      setEleveSelectionne(null)
      setMontant('')
      await loadDonnees()
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const referenceDate = new Date(selectedDate + 'T12:00:00')
  const dateLabel = referenceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const paiementsPeriode = useMemo(
    () => paiements.filter(p => isInPeriod(p.date, period, referenceDate)),
    [paiements, period, selectedDate]
  )
  const verificationsPeriode = useMemo(
    () => verifications.filter(v => isInPeriod(v.date, period, referenceDate)),
    [verifications, period, selectedDate]
  )

  const totalSecretaire = paiementsPeriode.reduce((sum, p) => sum + p.montant, 0)
  const totalEconomat = verificationsPeriode.reduce((sum, v) => sum + v.montant, 0)
  const nbElevesSecretaire = new Set(paiementsPeriode.map(p => p.eleveId)).size
  const nbElevesEconomat = new Set(verificationsPeriode.map(v => v.eleveId)).size
  const ecart = totalSecretaire - totalEconomat

  // Comparaison élève par élève : montant déclaré par la Secrétaire vs vérifié par l'Économat
  const comparaisonParEleve = useMemo(() => {
    const map = new Map()
    paiementsPeriode.forEach(p => {
      if (!p.eleve) return
      const entry = map.get(p.eleveId) || { eleve: p.eleve, secretaire: 0, economat: 0 }
      entry.secretaire += p.montant
      map.set(p.eleveId, entry)
    })
    verificationsPeriode.forEach(v => {
      if (!v.eleve) return
      const entry = map.get(v.eleveId) || { eleve: v.eleve, secretaire: 0, economat: 0 }
      entry.economat += v.montant
      map.set(v.eleveId, entry)
    })
    return Array.from(map.values())
      .map(e => ({ ...e, ecart: e.secretaire - e.economat }))
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
  }, [paiementsPeriode, verificationsPeriode])

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
        <Wallet className="w-6 h-6 text-blue-600" /> Vérification Financière
      </h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      {/* Formulaire de vérification */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Enregistrer un montant perçu</h3>

        <RechercheEleve onSelect={handleSelectEleve} eleveSelectionneId={eleveSelectionne?.id} />

        {eleveSelectionne && (
          <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-4 space-y-4">
            <p className="text-sm text-slate-700">
              Élève sélectionné : <strong>{eleveSelectionne.nom} {eleveSelectionne.prenom}</strong> — {eleveSelectionne.classe?.nom}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant perçu (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? 'Enregistrement...' : <><Check className="w-4 h-4" /> Enregistrer</>}
              </button>
            </div>
          </form>
        )}
        <p className="text-xs text-slate-500">
          Cette vérification est indépendante et comparée aux montants déclarés par la Secrétaire pour chaque élève, ci-dessous.
        </p>
      </div>

      {/* Sélecteur de période */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-4">
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
      <p className="text-sm text-slate-500 -mt-3">
        Période affichée : <strong>{PERIOD_LABELS[period]?.toLowerCase()}</strong> — ancrée sur le <strong>{dateLabel}</strong>
      </p>

      {/* Résumé écart déclaré vs vérifié */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <p className="text-slate-600 text-sm font-medium">Déclaré par la Secrétaire</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(totalSecretaire)}</p>
          <p className="text-xs text-slate-500 mt-1">{nbElevesSecretaire} élève{nbElevesSecretaire > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-slate-600 text-sm font-medium">Vérifié par l'Économat</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(totalEconomat)}</p>
          <p className="text-xs text-slate-500 mt-1">{nbElevesEconomat} élève{nbElevesEconomat > 1 ? 's' : ''}</p>
        </div>
        <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${ecart === 0 ? 'border-green-500' : 'border-red-500'}`}>
          <p className="text-slate-600 text-sm font-medium">Écart</p>
          <p className={`text-2xl font-bold ${ecart === 0 ? 'text-green-600' : 'text-red-600'}`}>{formatFCFA(ecart)}</p>
        </div>
      </div>

      {/* Comparaison élève par élève */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Comparaison par élève — Secrétaire vs Économat</h3>
        </div>
        {comparaisonParEleve.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucune donnée pour cette période</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Élève</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Classe</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Secrétaire</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Économat</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Écart</th>
                </tr>
              </thead>
              <tbody>
                {comparaisonParEleve.map(({ eleve, secretaire, economat, ecart: ecartEleve }) => (
                  <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{eleve.nom} {eleve.prenom} <span className="text-xs text-slate-400">({eleve.matricule})</span></td>
                    <td className="px-6 py-3 text-slate-600">{eleve.classe?.nom || '-'}</td>
                    <td className="px-6 py-3 text-center text-slate-900">{formatFCFA(secretaire)}</td>
                    <td className="px-6 py-3 text-center text-slate-900">{formatFCFA(economat)}</td>
                    <td className={`px-6 py-3 text-center font-semibold ${ecartEleve === 0 ? 'text-green-600' : 'text-red-600'}`}>{formatFCFA(ecartEleve)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
