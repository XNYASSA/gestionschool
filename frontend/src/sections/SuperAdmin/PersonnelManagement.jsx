export default function PersonnelManagement({ section }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">👔 Gestion du personnel</h2>
      <p className="text-slate-600">{section === 'list' ? 'Liste du personnel' : 'Ajouter du personnel'} - En développement...</p>
    </div>
  )
}
