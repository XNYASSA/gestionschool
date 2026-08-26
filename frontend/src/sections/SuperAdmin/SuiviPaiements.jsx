import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, AlertCircle, XCircle, Loader, Search } from 'lucide-react'
import { apiClient } from '../../api/client'

function calculerStatutEleve(fraisEleve) {
  const montantDu = fraisEleve.reduce((sum, f) => sum + f.montantDu, 0)
  const montantPaye = fraisEleve.reduce((sum, f) => sum + f.montantPaye, 0)

  let statut = 'IMPAYE'
  if (montantPaye >= montantDu && montantDu > 0) statut = 'SOLDE'
  else if (montantPaye > 0) statut = 'PARTIEL'

  return { montantDu, montantPaye, statut }
}

export default function SuiviPaiements() {
  const [frais, setFrais] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEcole, setFilterEcole] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  useEffect(() => {
    loadFrais()
  }, [])

  const loadFrais = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getFrais()
      setFrais(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des paiements')
    } finally {
      setLoading(false)
    }
  }

  // Regrouper les frais par élève et calculer le statut global
  const elevesAvecStatut = useMemo(() => {
    const parEleve = {}
    for (const f of frais) {
      if (!f.eleve) continue
      const id = f.eleve.id
      if (!parEleve[id]) {
        parEleve[id] = { eleve: f.eleve, frais: [] }
      }
      parEleve[id].frais.push(f)
    }

    return Object.values(parEleve).map(({ eleve, frais: fraisEleve }) => {
      const { montantDu, montantPaye, statut } = calculerStatutEleve(fraisEleve)
      return {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        matricule: eleve.matricule,
        classe: eleve.classe?.nom || '-',
        ecoleId: eleve.classe?.ecole?.id,
        ecoleNom: eleve.classe?.ecole?.nomCourt || '-',
        parent: eleve.nomParent,
        tel: eleve.telephoneParent,
        montantDu,
        montantPaye,
        statut
      }
    })
  }, [frais])

  const ecoles = useMemo(() => {
    const map = new Map()
    elevesAvecStatut.forEach(e => {
      if (e.ecoleId) map.set(e.ecoleId, e.ecoleNom)
    })
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }))
  }, [elevesAvecStatut])

  const filtered = elevesAvecStatut.filter(e => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!`${e.prenom} ${e.nom}`.toLowerCase().includes(term) && !e.matricule?.toLowerCase().includes(term)) {
        return false
      }
    }
    if (filterEcole && e.ecoleId !== filterEcole) return false
    if (filterStatut && e.statut !== filterStatut) return false
    return true
  })

  const counts = {
    SOLDE: elevesAvecStatut.filter(e => e.statut === 'SOLDE').length,
    PARTIEL: elevesAvecStatut.filter(e => e.statut === 'PARTIEL').length,
    IMPAYE: elevesAvecStatut.filter(e => e.statut === 'IMPAYE').length
  }

  const getStatusBadge = (statut) => {
    if (statut === 'SOLDE') return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Soldé</span>
    if (statut === 'PARTIEL') return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">⚠ Partiel</span>
    return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">✗ Non soldé</span>
  }

  const getStatusColor = (statut) => {
    if (statut === 'SOLDE') return 'border-l-4 border-green-500 bg-green-50'
    if (statut === 'PARTIEL') return 'border-l-4 border-orange-500 bg-orange-50'
    return 'border-l-4 border-red-500 bg-red-50'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">💰 Suivi des paiements élèves</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilterStatut(filterStatut === 'SOLDE' ? '' : 'SOLDE')}
          className={`text-left rounded-lg shadow-md p-4 transition ${getStatusColor('SOLDE')} ${filterStatut === 'SOLDE' ? 'ring-2 ring-green-500' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-slate-600">Soldés</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{counts.SOLDE}</p>
        </button>
        <button
          onClick={() => setFilterStatut(filterStatut === 'PARTIEL' ? '' : 'PARTIEL')}
          className={`text-left rounded-lg shadow-md p-4 transition ${getStatusColor('PARTIEL')} ${filterStatut === 'PARTIEL' ? 'ring-2 ring-orange-500' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-slate-600">Partiellement soldés</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{counts.PARTIEL}</p>
        </button>
        <button
          onClick={() => setFilterStatut(filterStatut === 'IMPAYE' ? '' : 'IMPAYE')}
          className={`text-left rounded-lg shadow-md p-4 transition ${getStatusColor('IMPAYE')} ${filterStatut === 'IMPAYE' ? 'ring-2 ring-red-500' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-slate-600">Non soldés</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{counts.IMPAYE}</p>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={filterEcole}
          onChange={(e) => setFilterEcole(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">Toutes les écoles</option>
          {ecoles.map(e => (
            <option key={e.id} value={e.id}>{e.nom}</option>
          ))}
        </select>
      </div>

      {/* Liste des élèves */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Liste des élèves ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader className="w-5 h-5 animate-spin" /> Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun élève trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Élève</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Classe</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">École</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Parent</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Téléphone</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant dû</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant payé</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(eleve => (
                  <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{eleve.prenom} {eleve.nom}</td>
                    <td className="px-6 py-3 text-slate-600">{eleve.classe}</td>
                    <td className="px-6 py-3 text-slate-600">{eleve.ecoleNom}</td>
                    <td className="px-6 py-3 text-slate-600">{eleve.parent}</td>
                    <td className="px-6 py-3 text-slate-600">{eleve.tel}</td>
                    <td className="px-6 py-3 text-center font-mono">{eleve.montantDu.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-6 py-3 text-center font-mono font-bold text-green-600">{eleve.montantPaye.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-6 py-3 text-center">{getStatusBadge(eleve.statut)}</td>
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
