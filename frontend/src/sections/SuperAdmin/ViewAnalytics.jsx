export default function ViewAnalytics() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">📈 Vue analytique multi-niveaux</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <select className="px-4 py-2 border border-slate-300 rounded-lg">
          <option>Toutes les écoles</option>
        </select>
        <select className="px-4 py-2 border border-slate-300 rounded-lg">
          <option>Toutes les classes</option>
        </select>
        <input type="text" placeholder="Rechercher élève..." className="px-4 py-2 border border-slate-300 rounded-lg" />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Résumé financier par période</h3>
        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="font-semibold text-slate-900">Entrées : 10 200 000 FCFA</p>
            <p className="text-sm text-slate-600">Frais inscription (1.2M) + Frais pension (8.5M) + Autres (500K)</p>
          </div>
          <div className="border-b pb-4">
            <p className="font-semibold text-slate-900">Sorties : 4 700 000 FCFA</p>
            <p className="text-sm text-slate-600">Salaires (3M) + Maintenance (500K) + Fournitures (800K) + Énergie (400K)</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-bold text-blue-600 text-lg">Bénéfice net : +5 500 000 FCFA</p>
          </div>
        </div>
      </div>
    </div>
  )
}
