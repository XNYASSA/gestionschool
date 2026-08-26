import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, XCircle, Loader, Users, ChevronRight, ArrowLeft, School, Layers } from 'lucide-react'
import { apiClient } from '../../api/client'

function calculerStatutEleve(fraisEleve) {
  const montantDu = fraisEleve.reduce((sum, f) => sum + f.montantDu, 0)
  const montantPaye = fraisEleve.reduce((sum, f) => sum + f.montantPaye, 0)

  let statut = 'IMPAYE'
  if (montantPaye >= montantDu && montantDu > 0) statut = 'SOLDE'
  else if (montantPaye > 0) statut = 'PARTIEL'

  return { montantDu, montantPaye, statut }
}

const formatFCFA = (m) => `${m.toLocaleString('fr-FR')} FCFA`

export default function SuiviPaiements() {
  const [frais, setFrais] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedEcole, setSelectedEcole] = useState(null) // { id, nom }
  const [selectedClasse, setSelectedClasse] = useState(null) // { id, nom }

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

  // Regrouper les frais par élève avec toutes les infos utiles
  const elevesAvecStatut = useMemo(() => {
    const parEleve = {}
    for (const f of frais) {
      if (!f.eleve) continue
      const id = f.eleve.id
      if (!parEleve[id]) parEleve[id] = { eleve: f.eleve, frais: [] }
      parEleve[id].frais.push(f)
    }

    return Object.values(parEleve).map(({ eleve, frais: fraisEleve }) => {
      const { montantDu, montantPaye, statut } = calculerStatutEleve(fraisEleve)
      return {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        matricule: eleve.matricule,
        sexe: eleve.sexe,
        classeId: eleve.classeId,
        classeNom: eleve.classe?.nom || '-',
        ecoleId: eleve.classe?.ecole?.id,
        ecoleNom: eleve.classe?.ecole?.nomCourt || '-',
        parent: eleve.nomParent,
        lieuParente: eleve.lieuParente,
        tel: eleve.telephoneParent,
        montantDu,
        montantPaye,
        restant: montantDu - montantPaye,
        statut
      }
    })
  }, [frais])

  // Niveau 1 : agrégation par école
  const ecolesSummary = useMemo(() => {
    const map = {}
    elevesAvecStatut.forEach(e => {
      if (!e.ecoleId) return
      if (!map[e.ecoleId]) {
        map[e.ecoleId] = { id: e.ecoleId, nom: e.ecoleNom, percu: 0, restant: 0, nbEleves: 0 }
      }
      map[e.ecoleId].percu += e.montantPaye
      map[e.ecoleId].restant += e.restant
      map[e.ecoleId].nbEleves += 1
    })
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [elevesAvecStatut])

  // Niveau 2 : agrégation par classe (pour l'école sélectionnée)
  const classesSummary = useMemo(() => {
    if (!selectedEcole) return []
    const map = {}
    elevesAvecStatut.filter(e => e.ecoleId === selectedEcole.id).forEach(e => {
      if (!map[e.classeId]) {
        map[e.classeId] = { id: e.classeId, nom: e.classeNom, percu: 0, restant: 0, nbEleves: 0 }
      }
      map[e.classeId].percu += e.montantPaye
      map[e.classeId].restant += e.restant
      map[e.classeId].nbEleves += 1
    })
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [elevesAvecStatut, selectedEcole])

  // Niveau 3 : élèves de la classe sélectionnée, séparés solvables / insolvables
  const elevesClasse = useMemo(() => {
    if (!selectedClasse) return { solvables: [], insolvables: [] }
    const eleves = elevesAvecStatut.filter(e => e.classeId === selectedClasse.id)
    return {
      solvables: eleves.filter(e => e.statut === 'SOLDE'),
      insolvables: eleves.filter(e => e.statut !== 'SOLDE')
    }
  }, [elevesAvecStatut, selectedClasse])

  const getStatusBadge = (statut) => {
    if (statut === 'SOLDE') return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Soldé</span>
    if (statut === 'PARTIEL') return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">⚠ Partiel</span>
    return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">✗ Non soldé</span>
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
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => { setSelectedEcole(null); setSelectedClasse(null) }}
          className={`hover:text-blue-600 transition ${!selectedEcole ? 'font-bold text-slate-900' : ''}`}
        >
          🏫 Écoles
        </button>
        {selectedEcole && (
          <>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => setSelectedClasse(null)}
              className={`hover:text-blue-600 transition ${!selectedClasse ? 'font-bold text-slate-900' : ''}`}
            >
              {selectedEcole.nom}
            </button>
          </>
        )}
        {selectedClasse && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="font-bold text-slate-900">{selectedClasse.nom}</span>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>
      )}

      {/* NIVEAU 1 : Écoles */}
      {!selectedEcole && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">💰 Statuts de paiement par école</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ecolesSummary.map(ecole => (
              <button
                key={ecole.id}
                onClick={() => setSelectedEcole({ id: ecole.id, nom: ecole.nom })}
                className="bg-white rounded-lg shadow-md p-5 text-left hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <School className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900">{ecole.nom}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mb-3">{ecole.nbEleves} élève{ecole.nbEleves > 1 ? 's' : ''}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Frais perçus</p>
                    <p className="font-bold text-green-600">{formatFCFA(ecole.percu)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Restant à percevoir</p>
                    <p className="font-bold text-red-600">{formatFCFA(ecole.restant)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NIVEAU 2 : Classes de l'école sélectionnée */}
      {selectedEcole && !selectedClasse && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedEcole(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Classes — {selectedEcole.nom}</h2>
          </div>
          {classesSummary.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">Aucune classe avec des frais enregistrés</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classesSummary.map(classe => (
                <button
                  key={classe.id}
                  onClick={() => setSelectedClasse({ id: classe.id, nom: classe.nom })}
                  className="bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-slate-900">{classe.nom}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{classe.nbEleves} élève{classe.nbEleves > 1 ? 's' : ''}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Perçu</span>
                      <span className="font-semibold text-green-600">{formatFCFA(classe.percu)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Restant</span>
                      <span className="font-semibold text-red-600">{formatFCFA(classe.restant)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NIVEAU 3 : Élèves de la classe sélectionnée */}
      {selectedClasse && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedClasse(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Élèves — {selectedClasse.nom}</h2>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" /> Garçons : <strong className="text-slate-900">{[...elevesClasse.solvables, ...elevesClasse.insolvables].filter(e => e.sexe === 'MASCULIN').length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-pink-500" /> Filles : <strong className="text-slate-900">{[...elevesClasse.solvables, ...elevesClasse.insolvables].filter(e => e.sexe === 'FEMININ').length}</strong>
            </span>
          </div>

          {/* Élèves solvables */}
          <EleveGroupTable
            title="Élèves solvables (à jour)"
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            eleves={elevesClasse.solvables}
            getStatusBadge={getStatusBadge}
          />

          {/* Élèves insolvables */}
          <EleveGroupTable
            title="Élèves insolvables (solde restant)"
            icon={<XCircle className="w-5 h-5 text-red-600" />}
            eleves={elevesClasse.insolvables}
            getStatusBadge={getStatusBadge}
          />
        </div>
      )}
    </div>
  )
}

function EleveGroupTable({ title, icon, eleves, getStatusBadge }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-slate-900">{title} ({eleves.length})</h3>
      </div>
      {eleves.length === 0 ? (
        <div className="p-6 text-center text-slate-500">Aucun élève dans cette catégorie</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Élève</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Sexe</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Parent</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Téléphone</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant dû</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Montant payé</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map(eleve => (
                <tr key={eleve.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-900">{eleve.prenom} {eleve.nom}</td>
                  <td className="px-6 py-3 text-center text-slate-600">{eleve.sexe === 'MASCULIN' ? '♂ M' : eleve.sexe === 'FEMININ' ? '♀ F' : '-'}</td>
                  <td className="px-6 py-3 text-slate-600">{eleve.parent}{eleve.lieuParente ? ` (${eleve.lieuParente})` : ''}</td>
                  <td className="px-6 py-3 text-slate-600">{eleve.tel}</td>
                  <td className="px-6 py-3 text-center font-mono">{formatFCFA(eleve.montantDu)}</td>
                  <td className="px-6 py-3 text-center font-mono font-bold text-green-600">{formatFCFA(eleve.montantPaye)}</td>
                  <td className="px-6 py-3 text-center">{getStatusBadge(eleve.statut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
