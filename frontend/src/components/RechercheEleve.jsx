import { useState, useEffect, useMemo } from 'react'
import { Search, Loader } from 'lucide-react'
import { apiClient } from '../api/client'

export default function RechercheEleve({ onSelect, eleveSelectionneId }) {
  const [eleves, setEleves] = useState([])
  const [ecoles, setEcoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [ecoleId, setEcoleId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    Promise.all([apiClient.getEleves(), apiClient.getEcoles()])
      .then(([elevesData, ecolesData]) => { setEleves(elevesData); setEcoles(ecolesData) })
      .finally(() => setLoading(false))
  }, [])

  const classesDisponibles = useMemo(() => {
    const map = new Map()
    eleves.forEach(e => {
      if (ecoleId && e.classe?.ecoleId !== ecoleId) return
      if (e.classe) map.set(e.classeId, e.classe)
    })
    return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [eleves, ecoleId])

  const resultats = useMemo(() => {
    if (!ecoleId && !classeId && !recherche.trim()) return []
    return eleves
      .filter(e => {
        if (ecoleId && e.classe?.ecoleId !== ecoleId) return false
        if (classeId && e.classeId !== classeId) return false
        if (recherche.trim() && !`${e.nom} ${e.prenom}`.toLowerCase().includes(recherche.trim().toLowerCase())) return false
        return true
      })
      .slice(0, 30)
  }, [eleves, ecoleId, classeId, recherche])

  if (loading) {
    return <div className="text-sm text-slate-500 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Chargement des élèves...</div>
  }

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 ${ecoles.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
        {ecoles.length > 1 && (
          <select
            value={ecoleId}
            onChange={(e) => { setEcoleId(e.target.value); setClasseId('') }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Toutes les écoles</option>
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
        )}
        <select
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">Toutes les classes</option>
          {classesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {resultats.length > 0 && (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-52 overflow-y-auto">
          {resultats.map(el => (
            <button
              key={el.id}
              type="button"
              onClick={() => onSelect(el)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition ${eleveSelectionneId === el.id ? 'bg-blue-50' : ''}`}
            >
              {el.nom} {el.prenom} — {el.classe?.nom} <span className="text-slate-400">({el.matricule})</span>
            </button>
          ))}
        </div>
      )}
      {(ecoleId || classeId || recherche.trim()) && resultats.length === 0 && (
        <p className="text-sm text-slate-500">Aucun élève trouvé.</p>
      )}
    </div>
  )
}
