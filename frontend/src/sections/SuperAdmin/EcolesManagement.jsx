export default function EcolesManagement({ section }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">🏫 Gestion des écoles</h2>
      <p className="text-slate-600">{section === 'list' ? 'Liste des écoles' : 'Créer une école'} - En développement...</p>
    </div>
  )
}
