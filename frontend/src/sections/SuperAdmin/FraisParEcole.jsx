import { useState, useEffect, useMemo } from 'react'
import { Loader, School, ArrowLeft, Wallet } from 'lucide-react'
import { apiClient } from '../../api/client'

const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

export default function FraisParEcole() {
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [frais, setFrais] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ecoleOuverte, setEcoleOuverte] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [ecolesData, classesData, fraisData] = await Promise.all([
        apiClient.getEcoles(),
        apiClient.getClasses(),
        apiClient.getFrais()
      ])
      setEcoles(ecolesData)
      setClasses(classesData)
      setFrais(fraisData)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des frais')
    } finally {
      setLoading(false)
    }
  }

  const totalParEcole = useMemo(() => {
    const map = {}
    ecoles.forEach(e => { map[e.id] = { du: 0, paye: 0 } })
    frais.forEach(f => {
      const ecoleId = f.eleve?.classe?.ecoleId
      if (ecoleId && map[ecoleId]) {
        map[ecoleId].du += f.montantDu
        map[ecoleId].paye += f.montantPaye
      }
    })
    return map
  }, [ecoles, frais])

  const totalParClasse = useMemo(() => {
    if (!ecoleOuverte) return []
    const classesEcole = classes.filter(c => c.ecoleId === ecoleOuverte.id)
    return classesEcole.map(classe => {
      const fraisClasse = frais.filter(f => f.eleve?.classeId === classe.id)
      return {
        classe,
        du: fraisClasse.reduce((sum, f) => sum + f.montantDu, 0),
        paye: fraisClasse.reduce((sum, f) => sum + f.montantPaye, 0)
      }
    }).sort((a, b) => b.paye - a.paye)
  }, [ecoleOuverte, classes, frais])

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {ecoleOuverte && (
          <button onClick={() => setEcoleOuverte(null)} className="p-2 hover:bg-slate-100 rounded-lg transition" title="Retour aux écoles">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" /> {ecoleOuverte ? `Frais par classe — ${ecoleOuverte.nomCourt}` : 'Frais par école'}
        </h2>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}

      {!ecoleOuverte ? (
        <p className="text-sm text-slate-500 -mt-4">Cliquez sur une école pour voir le détail par classe.</p>
      ) : (
        <p className="text-sm text-slate-500 -mt-4">Total dû / perçu par classe pour cette école.</p>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">{ecoleOuverte ? 'Classe' : 'École'}</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant dû</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant perçu</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Reste à percevoir</th>
              </tr>
            </thead>
            <tbody>
              {!ecoleOuverte ? (
                ecoles.map(ecole => {
                  const t = totalParEcole[ecole.id] || { du: 0, paye: 0 }
                  return (
                    <tr key={ecole.id} onClick={() => setEcoleOuverte(ecole)} className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <td className="px-6 py-3 text-slate-900 font-medium flex items-center gap-2">
                        <School className="w-4 h-4 text-blue-500" /> {ecole.nomCourt}
                      </td>
                      <td className="px-6 py-3 text-center text-slate-900">{formatFCFA(t.du)}</td>
                      <td className="px-6 py-3 text-center text-green-700 font-semibold">{formatFCFA(t.paye)}</td>
                      <td className="px-6 py-3 text-center text-red-600">{formatFCFA(t.du - t.paye)}</td>
                    </tr>
                  )
                })
              ) : totalParClasse.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Aucune classe pour cette école</td></tr>
              ) : (
                totalParClasse.map(({ classe, du, paye }) => (
                  <tr key={classe.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900 font-medium">{classe.nom}</td>
                    <td className="px-6 py-3 text-center text-slate-900">{formatFCFA(du)}</td>
                    <td className="px-6 py-3 text-center text-green-700 font-semibold">{formatFCFA(paye)}</td>
                    <td className="px-6 py-3 text-center text-red-600">{formatFCFA(du - paye)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
