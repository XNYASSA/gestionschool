import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { LogOut } from 'lucide-react'
import PersonnelRH from '../components/PersonnelRH'

export default function DashboardSurveillantGeneral() {
  const { user, ecoleSelectionnee, selectEcole, ecoles, logout } = useContext(AuthContext)

  if (!ecoleSelectionnee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <p className="text-slate-600">Sélectionnez une école</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🚔 Surveillance Générale</h1>
            <p className="text-sm text-slate-500">{user?.name} • {ecoleSelectionnee?.nomCourt}</p>
          </div>
          <div className="flex items-center gap-4">
            {ecoles && ecoles.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Établissement :</label>
                <select
                  value={ecoleSelectionnee?.id || ''}
                  onChange={(e) => selectEcole(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                >
                  {ecoles.map(ecole => (
                    <option key={ecole.id} value={ecole.id}>{ecole.nomCourt}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <PersonnelRH ecoleSelectionnee={ecoleSelectionnee} />
      </div>
    </div>
  )
}
