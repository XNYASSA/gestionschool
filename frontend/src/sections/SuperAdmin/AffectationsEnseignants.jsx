import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Loader } from 'lucide-react'
import { apiClient } from '../../api/client'

export default function AffectationsEnseignants() {
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [enseignants, setEnseignants] = useState([])
  const [classes, setClasses] = useState([])
  const [matieres, setMatieres] = useState([])
  const [affectations, setAffectations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ utilisateurId: '', classeId: '', matiereId: '' })

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
      const [employes, classesData, matieresData, affectationsData] = await Promise.all([
        apiClient.getEmployesEcole(ecoleId),
        apiClient.getClasses(),
        apiClient.getMatieresByEcole(ecoleId),
        apiClient.getAffectations(ecoleId)
      ])
      setEnseignants(employes.filter(e => e.role === 'ENSEIGNANT'))
      setClasses(classesData.filter(c => c.ecoleId === ecoleId))
      setMatieres(matieresData)
      setAffectations(affectationsData)
      setForm({ utilisateurId: '', classeId: '', matiereId: '' })
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    }
  }

  const handleAffecter = async (e) => {
    e.preventDefault()
    if (!form.utilisateurId || !form.classeId || !form.matiereId) return

    try {
      await apiClient.createAffectation({ ecoleId, ...form })
      await loadDonneesEcole()
    } catch (err) {
      setError(err.message || "Erreur lors de l'affectation")
    }
  }

  const handleSupprimer = async (id) => {
    if (!confirm('Retirer cette affectation ?')) return
    try {
      await apiClient.deleteAffectation(id)
      await loadDonneesEcole()
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression')
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
        <UserPlus className="w-6 h-6 text-indigo-600" /> Affectations enseignants
      </h2>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        ℹ️ Un enseignant doit être affecté à une classe + matière pour apparaître dans le Cahier de textes et pouvoir saisir des notes/bulletins pour cette classe.
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}

      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
        <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg">
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Nouvelle affectation</h3>
        {enseignants.length === 0 || classes.length === 0 || matieres.length === 0 ? (
          <p className="text-sm text-slate-500">
            {enseignants.length === 0 && "Aucun enseignant dans cette école. "}
            {classes.length === 0 && "Aucune classe dans cette école. "}
            {matieres.length === 0 && "Aucune matière définie pour cette école."}
          </p>
        ) : (
          <form onSubmit={handleAffecter} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Enseignant</label>
              <select
                value={form.utilisateurId}
                onChange={(e) => setForm({ ...form, utilisateurId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="">Sélectionner</option>
                {enseignants.map(ens => <option key={ens.utilisateurId} value={ens.utilisateurId}>{ens.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
              <select
                value={form.classeId}
                onChange={(e) => setForm({ ...form, classeId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="">Sélectionner</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
              <select
                value={form.matiereId}
                onChange={(e) => setForm({ ...form, matiereId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="">Sélectionner</option>
                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Affecter
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Affectations actuelles ({affectations.length})</h3>
        </div>
        {affectations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucune affectation pour cette école</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Enseignant</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Classe</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Matière</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affectations.map(a => (
                  <tr key={a.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{a.enseignantNom}</td>
                    <td className="px-6 py-3 text-slate-600">{a.classeNom}</td>
                    <td className="px-6 py-3 text-slate-600">{a.matiereNom}</td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => handleSupprimer(a.id)} className="p-2 hover:bg-red-100 rounded text-red-600 transition" title="Retirer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
