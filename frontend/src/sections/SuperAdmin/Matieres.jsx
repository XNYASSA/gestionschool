import { useState, useEffect, useMemo, useContext } from 'react'
import { BookOpen, Loader, Search, Plus } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthContext } from '../../context/AuthContext'

const FORMULAIRE_VIDE = { nom: '', abreviation: '', departement: '' }

export default function Matieres() {
  const { user } = useContext(AuthContext)
  const peutCreer = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE'].includes(user?.roleAPI)
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE)
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState('')
  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [matieres, setMatieres] = useState([])
  const [recherche, setRecherche] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.getEcoles()
      .then(data => {
        setEcoles(data)
        if (data.length > 0) setEcoleId(data[0].id)
      })
      .catch(err => setError(err.message || 'Erreur lors du chargement des écoles'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (ecoleId) loadMatieres(ecoleId)
  }, [ecoleId])

  const loadMatieres = async (id) => {
    setError('')
    try {
      const data = await apiClient.getMatieresByEcole(id)
      setMatieres(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des matières')
    }
  }

  const departementsExistants = useMemo(
    () => [...new Set(matieres.map(m => m.departement).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [matieres]
  )

  const ajouterMatiere = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const nom = formulaire.nom.trim()
    if (!nom) {
      setError('Le nom de la matière est obligatoire.')
      return
    }
    setEnregistrement(true)
    try {
      await apiClient.createMatiere(nom, ecoleId, 0, {
        abreviation: formulaire.abreviation.trim(),
        departement: formulaire.departement.trim()
      })
      const ecole = ecoles.find(x => x.id === ecoleId)
      setMessage(`Matière « ${nom} » ajoutée à l'école ${ecole?.nomCourt || ''}. Cochez-la dans « Programme de la classe » (Pédagogie → Bulletins) pour l'utiliser dans une classe.`)
      setFormulaire(FORMULAIRE_VIDE)
      await loadMatieres(ecoleId)
    } catch (err) {
      setError(err.message || "Erreur lors de l'ajout de la matière")
    } finally {
      setEnregistrement(false)
    }
  }

  const matieresFiltrees = useMemo(() => {
    if (!recherche.trim()) return matieres
    const terme = recherche.trim().toLowerCase()
    return matieres.filter(m =>
      m.nom.toLowerCase().includes(terme) ||
      m.abreviation?.toLowerCase().includes(terme) ||
      m.code?.toLowerCase().includes(terme)
    )
  }, [matieres, recherche])

  const parDepartement = useMemo(() => {
    const map = new Map()
    matieresFiltrees.forEach(m => {
      const cle = m.departement || 'Sans département'
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle).push(m)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [matieresFiltrees])

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
        <BookOpen className="w-6 h-6 text-purple-500" /> Matières
      </h2>
      <p className="text-sm text-slate-500 -mt-3">
        Catalogue des matières de l'école{peutCreer ? ' (le Principal et la Directrice peuvent en ajouter)' : ''}. Les coefficients et les enseignants se définissent classe par classe dans Pédagogie → Bulletins → « Programme de la classe ».
      </p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✅ {message}</div>}

      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
          <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg">
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Rechercher</label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-[38px]" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, abréviation ou code..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div className="text-sm text-slate-500 self-end pb-2">
          {matieresFiltrees.length} matière{matieresFiltrees.length > 1 ? 's' : ''}
        </div>
        {peutCreer && (
          <button
            type="button"
            onClick={() => { setAfficherFormulaire(!afficherFormulaire); setMessage(''); setError('') }}
            className="self-end px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter une matière
          </button>
        )}
      </div>

      {peutCreer && afficherFormulaire && (
        <form onSubmit={ajouterMatiere} className="bg-white rounded-lg shadow-md p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">
            Nouvelle matière pour l'école {ecoles.find(x => x.id === ecoleId)?.nomCourt}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la matière *</label>
              <input
                type="text"
                value={formulaire.nom}
                onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
                placeholder="Ex : Anglais"
                maxLength={100}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Abréviation</label>
              <input
                type="text"
                value={formulaire.abreviation}
                onChange={(e) => setFormulaire({ ...formulaire, abreviation: e.target.value })}
                placeholder="Ex : ANG"
                maxLength={20}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Département (groupe du bulletin)</label>
              <input
                type="text"
                list="departements-existants"
                value={formulaire.departement}
                onChange={(e) => setFormulaire({ ...formulaire, departement: e.target.value })}
                placeholder="Ex : LITTERATURE"
                maxLength={60}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <datalist id="departements-existants">
                {departementsExistants.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Les matières d'un même département sont regroupées (GROUPE 1, GROUPE 2…) sur le bulletin. Choisissez un département existant dans la liste pour éviter les doublons d'orthographe.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={enregistrement}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {enregistrement ? 'Enregistrement...' : 'Enregistrer la matière'}
            </button>
            <button
              type="button"
              onClick={() => { setAfficherFormulaire(false); setFormulaire(FORMULAIRE_VIDE) }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {parDepartement.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
          Aucune matière pour cette école
        </div>
      ) : (
        parDepartement.map(([departement, liste]) => (
          <div key={departement} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-3 font-bold text-slate-900 text-sm">
              {departement} <span className="text-slate-400 font-normal">({liste.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Matière</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Abréviation</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map(m => (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900">{m.nom}</td>
                      <td className="px-4 py-2 text-slate-500">{m.abreviation || '-'}</td>
                      <td className="px-4 py-2 text-slate-400 font-mono text-xs">{m.code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
