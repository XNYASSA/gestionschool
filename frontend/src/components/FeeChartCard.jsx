import { PieChart } from 'lucide-react'

export default function FeeChartCard({ students }) {
  // Compter les élèves par statut
  const statsCount = {
    'Soldé': students.filter(s => s.status === 'Soldé').length,
    'Partiel': students.filter(s => s.status === 'Partiel').length,
    'Impayé': students.filter(s => s.status === 'Impayé').length
  }

  const colors = {
    'Soldé': '#10b981',
    'Partiel': '#f59e0b',
    'Impayé': '#ef4444'
  }

  const total = Object.values(statsCount).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 slide-in">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
        Répartition des Statuts de Paiement
      </h3>
      <div className="space-y-4">
        <div className="space-y-3">
          {Object.entries(statsCount).map(([status, count]) => {
            const percentage = ((count / total) * 100).toFixed(0)
            return (
              <div key={status}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className="text-sm font-bold text-gray-900">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: colors[status]
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
