import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Loader, Calendar, User, Wallet } from 'lucide-react'
import { apiClient } from '../../api/client'

const todayISO = () => new Date().toISOString().split('T')[0]

const PERIOD_LABELS = { jour: "Jour", semaine: 'Semaine', mois: 'Mois' }

const SOURCE_LABELS = {
  SECRETAIRE: 'Secrétaire',
  PRINCIPAL: 'Principal/Directrice',
  ECONOMAT: 'Économat',
  SYSTEME: 'Système (paiements enregistrés)'
}

export default function AnomaliesDetailed() {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [period, setPeriod] = useState('jour')
  const [date, setDate] = useState(todayISO())
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEcoles()
  }, [])

  useEffect(() => {
    if (ecoleId) {
      loadRapport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecoleId, period, date])

  const loadEcoles = async () => {
    try {
      const data = await apiClient.getEcoles()
      setEcoles(data)
      if (data.length > 0) setEcoleId(data[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
      setLoading(false)
    }
  }

  const loadRapport = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getRapportAnomalies(ecoleId, period, date)
      setRapport(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du rapport')
    } finally {
      setLoading(false)
    }
  }

  const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <AlertTriangle className="w-6 h-6 text-red-500" /> Anomalies — Rapprochement des montants
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-4">
        <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg">
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Calendar className="w-4 h-4 text-blue-600" /> Date de référence :
        </label>
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" />

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

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      ) : rapport && (
        <>
          {/* Déclarations des 3 rôles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DeclarationCard icon="👩‍💻" titre="Secrétaire" montant={rapport.declarations.secretaire} />
            <DeclarationCard icon="👨‍💼" titre="Principal / Directrice" montant={rapport.declarations.principal} />
            <DeclarationCard icon="💰" titre="Économat" montant={rapport.declarations.economat} />
          </div>

          {/* Détail système (données réelles enregistrées) */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Détail système (paiements enregistrés)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Frais d'inscription</p>
                <p className="text-xl font-bold text-slate-900">{formatFCFA(rapport.detailSysteme.inscriptions)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Frais de pension</p>
                <p className="text-xl font-bold text-slate-900">{formatFCFA(rapport.detailSysteme.pensions)}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-slate-600">Total global</p>
                <p className="text-xl font-bold text-indigo-700">{formatFCFA(rapport.detailSysteme.total)}</p>
              </div>
            </div>
          </div>

          {/* Incohérences */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Incohérences détectées</h3>
            {rapport.incoherences.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle2 className="w-5 h-5" />
                Aucune incohérence détectée entre les déclarations et les données système pour cette période.
              </div>
            ) : (
              <div className="space-y-3">
                {rapport.incoherences.map((inc, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <User className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{SOURCE_LABELS[inc.source1]}</span>
                      <span className="text-slate-400">({formatFCFA(inc.montant1)})</span>
                      <span className="text-slate-400">vs</span>
                      <span className="font-medium">{SOURCE_LABELS[inc.source2]}</span>
                      <span className="text-slate-400">({formatFCFA(inc.montant2)})</span>
                    </div>
                    <span className="font-bold text-red-600">Écart : {formatFCFA(Math.abs(inc.ecart))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function DeclarationCard({ icon, titre, montant }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-bold text-slate-900">{titre}</h3>
      </div>
      <p className="text-2xl font-bold text-slate-900">{(montant || 0).toLocaleString('fr-FR')} FCFA</p>
      <p className="text-xs text-slate-500 mt-1">Montant déclaré pour la période</p>
    </div>
  )
}
