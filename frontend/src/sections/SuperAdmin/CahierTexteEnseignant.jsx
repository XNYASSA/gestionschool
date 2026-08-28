import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

export default function CahierTexteEnseignant() {
  const [mesEcm, setMesEcm] = useState([])
  const [selectedEcmId, setSelectedEcmId] = useState('')
  const [lecons, setLecons] = useState([])
  const [objectifInput, setObjectifInput] = useState('')
  const [leconData, setLeconData] = useState({ date: new Date().toISOString().split('T')[0], titre: '', contenu: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    loadMesEcm()
  }, [])

  useEffect(() => {
    if (selectedEcmId) {
      loadLecons(selectedEcmId)
      const ecm = mesEcm.find(e => e.ecmId === selectedEcmId)
      setObjectifInput(ecm ? String(ecm.nombreLeconsPrevues) : '')
    }
  }, [selectedEcmId])

  const loadMesEcm = async () => {
    setError('')
    try {
      const data = await apiClient.getMesEcm()
      setMesEcm(data)
      if (data.length > 0 && !selectedEcmId) {
        setSelectedEcmId(data[0].ecmId)
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement de vos affectations')
    }
  }

  const loadLecons = async (ecmId) => {
    try {
      const data = await apiClient.getLecons(ecmId)
      setLecons(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des leçons')
    }
  }

  const handleObjectifSubmit = async (e) => {
    e.preventDefault()
    const valeur = parseInt(objectifInput)
    if (isNaN(valeur) || valeur < 0) return

    try {
      await apiClient.updateObjectifLecons(selectedEcmId, valeur)
      await loadMesEcm()
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour de l'objectif")
    }
  }

  const handleLeconSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEcmId || !leconData.date || !leconData.titre) return

    try {
      await apiClient.createLecon({ ecmId: selectedEcmId, ...leconData })
      setLeconData({ date: new Date().toISOString().split('T')[0], titre: '', contenu: '' })
      await loadLecons(selectedEcmId)
      await loadMesEcm()
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement de la leçon")
    }
  }

  const ecmSelectionne = mesEcm.find(e => e.ecmId === selectedEcmId)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">📖 Cahier de texte — Progression du programme</h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}

      {mesEcm.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
          Aucune classe/matière ne vous est encore affectée.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Classe / Matière</label>
            <select
              value={selectedEcmId}
              onChange={(e) => setSelectedEcmId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {mesEcm.map(ecm => (
                <option key={ecm.ecmId} value={ecm.ecmId}>
                  {ecm.classeNom} — {ecm.matiereNom} ({ecm.ecoleNom})
                </option>
              ))}
            </select>
          </div>

          {ecmSelectionne && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">Progression</span>
                <span className="text-2xl font-bold text-orange-600">{ecmSelectionne.pourcentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    ecmSelectionne.pourcentage >= 75 ? 'bg-green-500' : ecmSelectionne.pourcentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${ecmSelectionne.pourcentage}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {ecmSelectionne.nombreLeconsFaites} leçon(s) faite(s) · {ecmSelectionne.nombreLeconsRestantes} restante(s) sur {ecmSelectionne.nombreLeconsPrevues} prévue(s)
              </p>

              <form onSubmit={handleObjectifSubmit} className="flex items-end gap-2 mt-4 pt-4 border-t border-slate-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de leçons prévues (année)</label>
                  <input
                    type="number"
                    min="0"
                    value={objectifInput}
                    onChange={(e) => setObjectifInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition">
                  Mettre à jour
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Saisir une leçon faite</h3>
            <form onSubmit={handleLeconSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={leconData.date}
                    onChange={(e) => setLeconData({ ...leconData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la leçon</label>
                  <input
                    type="text"
                    value={leconData.titre}
                    onChange={(e) => setLeconData({ ...leconData, titre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Ex: Les fractions"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contenu (facultatif)</label>
                <textarea
                  value={leconData.contenu}
                  onChange={(e) => setLeconData({ ...leconData, contenu: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows="2"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Enregistrer la leçon
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Leçons saisies ({lecons.length})</h3>
            </div>
            {lecons.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucune leçon saisie pour cette classe/matière</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Titre</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Contenu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lecons.map(lecon => (
                      <tr key={lecon.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-600">{new Date(lecon.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-2 text-slate-900">{lecon.titre}</td>
                        <td className="px-4 py-2 text-slate-600">{lecon.contenu || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
