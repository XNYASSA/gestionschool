import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { DollarSign, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatFCFA, formatFCFALong, formatPercent } from '../utils/formatters'

export default function DashboardOwnerNew({ filters }) {
  const { getStatistics, getTopStudents, studentsData } = useContext(AppContext)
  const stats = getStatistics()
  const topStudents = getTopStudents()
  const impayedStudents = studentsData.filter(s => s.status === "Impayé")

  const [expandedKPI, setExpandedKPI] = useState(null)

  const kpis = [
    {
      id: 'revenue',
      icon: DollarSign,
      title: 'Trésorerie Collectée',
      value: formatFCFALong(stats.totalFeesCollected),
      detail: `${stats.percentageCollected}% du budget attendu`,
      color: 'green'
    },
    {
      id: 'remaining',
      icon: AlertTriangle,
      title: 'Montant Impayé',
      value: formatFCFALong(stats.totalFeesRemaining),
      detail: `${impayedStudents.length} élèves`,
      color: 'red'
    },
    {
      id: 'students',
      icon: Users,
      title: 'Effectif Total',
      value: stats.totalStudents,
      detail: 'élèves inscrits',
      color: 'blue'
    },
    {
      id: 'result',
      icon: TrendingUp,
      title: 'Résultat Net',
      value: formatFCFALong(stats.totalFeesCollected - 1250000),
      detail: stats.totalFeesCollected - 1250000 >= 0 ? 'Bénéfice' : 'Déficit',
      color: stats.totalFeesCollected - 1250000 >= 0 ? 'blue' : 'red'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold text-white">Vue Stratégique</h1>
        <p className="text-gray-400 mt-2">Synthèse consolidée de l'établissement</p>
      </div>

      {/* Alertes */}
      {impayedStudents.length > 0 && (
        <div className="bg-red-500/20 border-l-4 border-red-500 rounded-lg p-4 slide-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-300 text-lg">Actions Critiques Requises</h3>
              <p className="text-red-200 text-sm mt-1">
                {impayedStudents.length} paiements impayés — {formatFCFA(stats.totalFeesRemaining)} FCFA non collectés
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Cliquables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          const colorMap = {
            green: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
            red: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
            blue: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
            orange: 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
          }

          return (
            <button
              key={kpi.id}
              onClick={() => setExpandedKPI(expandedKPI === kpi.id ? null : kpi.id)}
              className={`bg-gradient-to-br ${colorMap[kpi.color]} text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 cursor-pointer text-left`}
            >
              <Icon className="w-8 h-8 mb-4 opacity-80" />
              <p className="text-white/70 text-sm font-medium mb-2">{kpi.title}</p>
              <p className="text-3xl font-bold">{kpi.value}</p>
              <p className="text-white/60 text-xs mt-2">{kpi.detail}</p>
            </button>
          )
        })}
      </div>

      {/* Détail Drill-Down */}
      {expandedKPI && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-6 slide-in">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              Détail: {kpis.find(k => k.id === expandedKPI)?.title}
            </h2>
            <button
              onClick={() => setExpandedKPI(null)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {expandedKPI === 'revenue' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/50">
                <p className="text-green-300 text-sm font-semibold">Collecté</p>
                <p className="text-2xl font-bold text-green-400 mt-2">{formatFCFA(stats.totalFeesCollected)}</p>
              </div>
              <div className="bg-orange-500/20 p-4 rounded-lg border border-orange-500/50">
                <p className="text-orange-300 text-sm font-semibold">Attendu</p>
                <p className="text-2xl font-bold text-orange-400 mt-2">{formatFCFA(stats.totalFeesExpected)}</p>
              </div>
              <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/50">
                <p className="text-blue-300 text-sm font-semibold">Progression</p>
                <p className="text-2xl font-bold text-blue-400 mt-2">{formatPercent(stats.percentageCollected)}</p>
              </div>
            </div>
          )}

          {expandedKPI === 'result' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/50">
                  <p className="text-blue-300 text-sm font-semibold">Recettes</p>
                  <p className="text-2xl font-bold text-blue-400 mt-2">{formatFCFA(stats.totalFeesCollected)}</p>
                </div>
                <div className="bg-orange-500/20 p-4 rounded-lg border border-orange-500/50">
                  <p className="text-orange-300 text-sm font-semibold">Dépenses</p>
                  <p className="text-2xl font-bold text-orange-400 mt-2">1 250 000 FCFA</p>
                </div>
              </div>
              <div className={`text-center py-6 rounded-lg border-2 ${stats.totalFeesCollected - 1250000 >= 0 ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
                <p className={stats.totalFeesCollected - 1250000 >= 0 ? 'text-green-300' : 'text-red-300'}>
                  Résultat Net
                </p>
                <p className={`text-3xl font-bold mt-2 ${stats.totalFeesCollected - 1250000 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatFCFA(stats.totalFeesCollected - 1250000)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Élèves */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6">Top 5 Meilleurs Élèves</h3>
        <div className="space-y-3">
          {topStudents.map((student, idx) => (
            <div key={student.id} className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx]}</span>
                <div>
                  <p className="font-semibold text-white">{student.firstName} {student.lastName}</p>
                  <p className="text-sm text-gray-400">{student.class}</p>
                </div>
              </div>
              <p className="text-xl font-bold text-blue-400">{student.average}/20</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
