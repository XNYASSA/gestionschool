import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

export default function SuiviPaiements() {
  const eleves = [
    { id: 1, nom: 'Dupont', prenom: 'Jean', parent: 'Marie Dupont', tel: '+237 6 XX XXX XXXX', statut: 'SOLDE', montantDu: 500000, montantPaye: 500000 },
    { id: 2, nom: 'Martin', prenom: 'Sophie', parent: 'Pierre Martin', tel: '+237 6 XX XXX XXXX', statut: 'PARTIEL', montantDu: 500000, montantPaye: 250000 },
    { id: 3, nom: 'Bernard', prenom: 'Thomas', parent: 'Anne Bernard', tel: '+237 6 XX XXX XXXX', statut: 'IMPAYE', montantDu: 500000, montantPaye: 0 },
  ]

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

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-lg shadow-md p-4 ${getStatusColor('SOLDE')}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-slate-600">Soldés</p>
          </div>
          <p className="text-2xl font-bold text-green-600">19</p>
        </div>
        <div className={`rounded-lg shadow-md p-4 ${getStatusColor('PARTIEL')}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-slate-600">Partiellement soldés</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">7</p>
        </div>
        <div className={`rounded-lg shadow-md p-4 ${getStatusColor('IMPAYE')}`}>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-slate-600">Non soldés</p>
          </div>
          <p className="text-2xl font-bold text-red-600">4</p>
        </div>
      </div>

      {/* Liste des élèves */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Liste des élèves ({eleves.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Élève</th>
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
                  <td className="px-6 py-3 text-slate-600">{eleve.parent}</td>
                  <td className="px-6 py-3 text-slate-600">{eleve.tel}</td>
                  <td className="px-6 py-3 text-center font-mono">{(eleve.montantDu / 1000).toFixed(0)}K FCFA</td>
                  <td className="px-6 py-3 text-center font-mono font-bold text-green-600">{(eleve.montantPaye / 1000).toFixed(0)}K FCFA</td>
                  <td className="px-6 py-3 text-center">{getStatusBadge(eleve.statut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
