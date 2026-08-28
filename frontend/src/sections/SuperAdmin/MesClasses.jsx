import { useState, useEffect } from 'react'
import { BookOpen, Loader, Check } from 'lucide-react'
import { apiClient } from '../../api/client'

export default function MesClasses() {
  const [mesEcm, setMesEcm] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [coeffEdits, setCoeffEdits] = useState({})
  const [savedId, setSavedId] = useState('')

  useEffect(() => {
    loadMesEcm()
  }, [])

  const loadMesEcm = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getMesEcm()
      setMesEcm(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement de vos affectations')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCoeff = async (matiereId) => {
    const valeur = parseInt(coeffEdits[matiereId])
    if (isNaN(valeur) || valeur < 1) return
    try {
      await apiClient.updateMatiere(matiereId, { coefficient: valeur })
      setSavedId(matiereId)
      setTimeout(() => setSavedId(''), 1500)
      await loadMesEcm()
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du coefficient')
    }
  }

  // Regrouper par classe, avec les matières enseignées dans chacune
  const classes = mesEcm.reduce((acc, ecm) => {
    let classe = acc.find(c => c.classeId === ecm.classeId)
    if (!classe) {
      classe = { classeId: ecm.classeId, classeNom: ecm.classeNom, ecoleNom: ecm.ecoleNom, matieres: [] }
      acc.push(classe)
    }
    classe.matieres.push(ecm)
    return acc
  }, [])

  // Une ligne par matière distincte, pour le formulaire de coefficient (une matière peut revenir dans plusieurs classes)
  const matieresUniques = Array.from(new Map(mesEcm.map(e => [e.matiereId, e])).values())

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">📚 Mes classes</h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}

      {mesEcm.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
          Aucune classe/matière ne vous est encore affectée.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(classe => (
              <div key={classe.classeId} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{classe.classeNom}</h3>
                    <p className="text-sm text-slate-600">{classe.ecoleNom}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-500 opacity-30" />
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {classe.matieres.map(m => (
                    <span key={m.ecmId} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full mr-1 mb-1">
                      {m.matiereNom}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Coefficient de mes matières</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {matieresUniques.map(m => (
                <div key={m.matiereId} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-sm text-slate-900">{m.matiereNom} <span className="text-xs text-slate-400">({m.ecoleNom})</span></span>
                  <input
                    type="number"
                    min="1"
                    value={coeffEdits[m.matiereId] ?? m.coefficient}
                    onChange={(e) => setCoeffEdits({ ...coeffEdits, [m.matiereId]: e.target.value })}
                    className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center"
                  />
                  <button
                    onClick={() => handleSaveCoeff(m.matiereId)}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition text-sm flex items-center gap-1"
                  >
                    {savedId === m.matiereId ? <Check className="w-4 h-4" /> : 'Enregistrer'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 px-4 pb-3">
              Le coefficient s'applique à toute l'école pour cette matière (utilisé dans le calcul des moyennes/bulletins).
            </p>
          </div>
        </>
      )}
    </div>
  )
}
