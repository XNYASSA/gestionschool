import { useState, useEffect, useMemo } from 'react'
import { Wallet, Plus, Loader, Calendar, Receipt } from 'lucide-react'
import { apiClient } from '../../api/client'
import { isInPeriod, PERIOD_LABELS } from '../../utils/periodFilter'

const todayISO = () => new Date().toISOString().split('T')[0]
const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

export default function VerificationFinanciere() {
  const [ecoles, setEcoles] = useState([])
  const [paiements, setPaiements] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [period, setPeriod] = useState('jour')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const [showForm, setShowForm] = useState(false)
  const [formEcoleId, setFormEcoleId] = useState('')
  const [formData, setFormData] = useState({ montantVerifie: '', numeroCompte: '', notes: '' })

  useEffect(() => {
    loadDonnees()
  }, [])

  const loadDonnees = async () => {
    setLoading(true)
    setError('')
    try {
      const [ecolesData, paiementsData] = await Promise.all([
        apiClient.getEcoles(),
        apiClient.getPaiements()
      ])
      setEcoles(ecolesData)
      setPaiements(paiementsData)
      if (ecolesData.length > 0) setFormEcoleId(ecolesData[0].id)

      const verifsParEcole = await Promise.all(
        ecolesData.map(e => apiClient.getSaisiesQuotidiennes(e.id, { type: 'FRAIS_COLLECTES' }))
      )
      setVerifications(verifsParEcole.flat().filter(s => s.role === 'ECONOMAT'))
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const referenceDate = new Date(selectedDate + 'T12:00:00')
  const dateLabel = referenceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const paiementsPeriode = useMemo(
    () => paiements.filter(p => isInPeriod(p.date, period, referenceDate)),
    [paiements, period, selectedDate]
  )

  // Comptabilité des reçus : organisée par école puis par classe
  const comptabiliteParEcole = useMemo(() => {
    const parEcole = {}
    paiementsPeriode.forEach(p => {
      const ecoleId = p.eleve?.classe?.ecoleId
      const classeNom = p.eleve?.classe?.nom || 'Classe inconnue'
      if (!ecoleId) return
      if (!parEcole[ecoleId]) parEcole[ecoleId] = { classes: {}, total: 0, nbRecus: 0 }
      if (!parEcole[ecoleId].classes[classeNom]) parEcole[ecoleId].classes[classeNom] = { total: 0, nbRecus: 0 }
      parEcole[ecoleId].classes[classeNom].total += p.montant
      parEcole[ecoleId].classes[classeNom].nbRecus += 1
      parEcole[ecoleId].total += p.montant
      parEcole[ecoleId].nbRecus += 1
    })
    return Object.entries(parEcole).map(([ecoleId, data]) => ({
      ecoleId,
      ecoleNom: ecoles.find(e => e.id === ecoleId)?.nomCourt || ecoleId,
      total: data.total,
      nbRecus: data.nbRecus,
      classes: Object.entries(data.classes)
        .map(([nom, c]) => ({ nom, ...c }))
        .sort((a, b) => a.nom.localeCompare(b.nom))
    }))
  }, [paiementsPeriode, ecoles])

  const totalGeneral = paiementsPeriode.reduce((sum, p) => sum + p.montant, 0)
  const nbRecusGeneral = paiementsPeriode.length

  const verificationsPeriode = useMemo(
    () => verifications.filter(s => isInPeriod(s.date, period, referenceDate)),
    [verifications, period, selectedDate]
  )
  const totalVerifie = verificationsPeriode.reduce((sum, s) => sum + (s.donnees?.montantVerifie || 0), 0)
  const ecart = totalGeneral - totalVerifie

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formEcoleId) return

    try {
      await apiClient.creerSaisieQuotidienne(formEcoleId, {
        date: new Date().toISOString(),
        type: 'FRAIS_COLLECTES',
        donnees: {
          montantTotal: parseInt(formData.montantVerifie),
          montantVerifie: parseInt(formData.montantVerifie),
          numeroCompte: formData.numeroCompte,
          notes: formData.notes,
          type: 'VERIFICATION_BANCAIRE'
        }
      })
      setFormData({ montantVerifie: '', numeroCompte: '', notes: '' })
      setShowForm(false)
      loadDonnees()
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement")
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
        <Wallet className="w-6 h-6 text-blue-600" /> Vérification Financière
      </h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}

      {/* Formulaire de vérification bancaire */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">Enregistrer une vérification</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Vérifier un montant
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 pt-4">
            {ecoles.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">École concernée</label>
                <select value={formEcoleId} onChange={(e) => setFormEcoleId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant vérifié (FCFA)</label>
              <input
                type="number"
                value={formData.montantVerifie}
                onChange={(e) => setFormData({ ...formData, montantVerifie: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Ex: 2400000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de compte / Référence</label>
              <input
                type="text"
                value={formData.numeroCompte}
                onChange={(e) => setFormData({ ...formData, numeroCompte: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Ex: COMPTE-XXX-YYY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Observations</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows="3"
                placeholder="Ex: Versement effectué le 25/01, manque 100K FCFA..."
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                Enregistrer vérification
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition">
                Annuler
              </button>
            </div>
          </form>
        )}
        <p className="text-xs text-slate-500 mt-3">
          Cette vérification est enregistrée dans le système et comparée aux montants déclarés par la Secrétaire et le Principal/Directeur(trice) (section Anomalies).
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
          <p className="text-slate-600 text-sm font-medium">Reçus collectés (système)</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(totalGeneral)}</p>
          <p className="text-xs text-slate-500 mt-1">{nbRecusGeneral} reçu{nbRecusGeneral > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-slate-600 text-sm font-medium">Total vérifié (bancaire)</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(totalVerifie)}</p>
        </div>
        <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${ecart === 0 ? 'border-green-500' : 'border-red-500'}`}>
          <p className="text-slate-600 text-sm font-medium">Écart</p>
          <p className={`text-2xl font-bold ${ecart === 0 ? 'text-green-600' : 'text-red-600'}`}>{formatFCFA(ecart)}</p>
        </div>
      </div>

      {/* Comptabilité des reçus, par école puis par classe */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900">Comptabilité des reçus — par école et par classe</h3>
        </div>
        {comptabiliteParEcole.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun reçu pour cette période</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {comptabiliteParEcole.map(ecole => (
              <div key={ecole.ecoleId} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-900">🏫 {ecole.ecoleNom}</h4>
                  <span className="font-semibold text-slate-700">{formatFCFA(ecole.total)} — {ecole.nbRecus} reçu{ecole.nbRecus > 1 ? 's' : ''}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {ecole.classes.map(classe => (
                      <tr key={classe.nom} className="border-t border-slate-100">
                        <td className="py-2 pl-4 text-slate-700">{classe.nom}</td>
                        <td className="py-2 text-center text-slate-500">{classe.nbRecus} reçu{classe.nbRecus > 1 ? 's' : ''}</td>
                        <td className="py-2 pr-4 text-right font-medium text-slate-900">{formatFCFA(classe.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique des vérifications enregistrées */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Vérifications enregistrées sur la période</h3>
        </div>
        {verificationsPeriode.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucune vérification enregistrée pour cette période</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">École</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">Montant vérifié</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Référence</th>
                </tr>
              </thead>
              <tbody>
                {verificationsPeriode.map(saisie => (
                  <tr key={saisie.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900">{new Date(saisie.date).toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{ecoles.find(e => e.id === saisie.ecoleId)?.nomCourt || '-'}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-right text-slate-900">{formatFCFA(saisie.donnees?.montantVerifie)}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{saisie.donnees?.numeroCompte || '-'}</td>
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
