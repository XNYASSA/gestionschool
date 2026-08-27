import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, AlertCircle, Loader, Calendar } from 'lucide-react'
import { apiClient } from '../../api/client'
import { isInPeriod, PERIOD_LABELS } from '../../utils/periodFilter'

const todayISO = () => new Date().toISOString().split('T')[0]

export default function RapportsFinanciers() {
  const [stats, setStats] = useState({ totalEcoles: 0, totalEleves: 0, personnels: 0, anomalies: 0 })
  const [frais, setFrais] = useState([])
  const [depenses, setDepenses] = useState([])
  const [personnelActif, setPersonnelActif] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [period, setPeriod] = useState('mois')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [ecoles, eleves, fraisData, depensesData, anomalies, utilisateurs] = await Promise.all([
        apiClient.getEcoles(),
        apiClient.getEleves(),
        apiClient.getFrais(),
        apiClient.getDepenses(),
        apiClient.getAnomalies(),
        apiClient.getUtilisateurs()
      ])

      setFrais(fraisData)
      setDepenses(depensesData)
      setPersonnelActif(utilisateurs.filter(u => u.actif && u.salaireMensuel))
      setStats({
        totalEcoles: ecoles.length,
        totalEleves: eleves.length,
        // Même source que Personnel → Liste du personnel (comptes Utilisateur, hors Super Admin)
        personnels: utilisateurs.filter(u => u.role !== 'SUPER_ADMIN').length,
        anomalies: anomalies.filter(a => !a.resolue).length
      })
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du rapport financier')
    } finally {
      setLoading(false)
    }
  }

  const formatFCFA = (m) => `${m.toLocaleString('fr-FR')} FCFA`
  const referenceDate = useMemo(() => new Date(selectedDate + 'T12:00:00'), [selectedDate])

  const fraisPeriode = frais.filter(f => f.montantPaye > 0 && isInPeriod(f.datePayement || f.createdAt, period, referenceDate))
  const inscriptions = fraisPeriode.filter(f => f.tranche === 'inscription').reduce((sum, f) => sum + f.montantPaye, 0)
  const pensions = fraisPeriode.filter(f => f.tranche !== 'inscription').reduce((sum, f) => sum + f.montantPaye, 0)
  const totalEntrees = inscriptions + pensions

  // Salaires : montant mensuel actuel du personnel actif, indépendant de la période consultée
  const totalSalaires = personnelActif.reduce((sum, p) => sum + (p.salaireMensuel || 0), 0)

  const depensesPeriode = depenses.filter(d => isInPeriod(d.dateDepense, period, referenceDate))
  const totalFixes = depensesPeriode.filter(d => d.type === 'FIXE').reduce((sum, d) => sum + d.montant, 0)
  const totalVariables = depensesPeriode.filter(d => d.type === 'VARIABLE').reduce((sum, d) => sum + d.montant, 0)
  const totalSorties = totalSalaires + totalFixes + totalVariables

  const resultatNet = totalEntrees - totalSorties

  const dateLabel = referenceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">📊 Rapports financiers</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Sélection de la date de référence */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Calendar className="w-4 h-4 text-blue-600" />
          Consulter à la date du :
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
              className={`px-4 py-2 rounded-lg transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-500 -mt-3">
        Période affichée : <strong>{PERIOD_LABELS[period]?.toLowerCase()}</strong> — ancrée sur le <strong>{dateLabel}</strong>
      </p>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Écoles" value={stats.totalEcoles} icon="🏫" color="blue" />
            <StatCard title="Total élèves" value={stats.totalEleves || 0} icon="👥" color="green" />
            <StatCard title="Anomalies non résolues" value={stats.anomalies || 0} icon="🚨" color="red" />
            <StatCard title="Personnels" value={stats.personnels || 0} icon="👔" color="purple" />
          </div>

          {/* Entrées/Sorties d'argent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entrées d'argent */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-slate-900">Entrées d'argent</h2>
              </div>
              <div className="space-y-3">
                <FinanceRow label="Frais d'inscription" amount={formatFCFA(inscriptions)} color="green" />
                <FinanceRow label="Frais de pension" amount={formatFCFA(pensions)} color="green" />
                <div className="border-t border-slate-200 pt-3 font-bold text-lg">
                  <span>Total : </span>
                  <span className="text-green-600">{formatFCFA(totalEntrees)}</span>
                </div>
              </div>
            </div>

            {/* Sorties d'argent */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">Sorties d'argent</h2>
              </div>
              <div className="space-y-3">
                <FinanceRow label="Salaires (personnel actif)" amount={formatFCFA(totalSalaires)} color="red" />
                <FinanceRow label="Autres charges fixes" amount={formatFCFA(totalFixes)} color="red" />
                <FinanceRow label="Charges variables (matériel...)" amount={formatFCFA(totalVariables)} color="red" />
                <div className="border-t border-slate-200 pt-3 font-bold text-lg">
                  <span>Total : </span>
                  <span className="text-red-600">{formatFCFA(totalSorties)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bénéfice/Perte */}
          <div className={`rounded-lg shadow-md p-6 text-white bg-gradient-to-r ${
            resultatNet >= 0 ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'
          }`}>
            <h2 className="text-lg font-bold mb-2">Résultat net ({PERIOD_LABELS[period]?.toLowerCase()} — {dateLabel})</h2>
            <p className="text-4xl font-bold">{resultatNet >= 0 ? '+' : ''}{formatFCFA(resultatNet)}</p>
            <p className="text-sm text-white/80 mt-2">Entrées - Sorties</p>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    red: 'border-red-500 bg-red-50',
    purple: 'border-purple-500 bg-purple-50'
  }
  const textClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  }
  return (
    <div className={`rounded-lg shadow-md p-4 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-xs font-medium">{title}</p>
          <p className={`text-2xl font-bold ${textClasses[color]}`}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function FinanceRow({ label, amount, color }) {
  const textColor = color === 'green' ? 'text-green-600' : 'text-red-600'
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-700">{label}</span>
      <span className={`font-semibold ${textColor}`}>{amount}</span>
    </div>
  )
}
