import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { DollarSign, Users, TrendingUp, Building2, BarChart3, AlertCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import TopStudentsCard from '../components/TopStudentsCard'
import FeeChartCard from '../components/FeeChartCard'

export default function DashboardOwner() {
  const { getStatistics, getTopStudents, studentsData } = useContext(AppContext)
  const [expandedPanel, setExpandedPanel] = useState(null)
  const stats = getStatistics()
  const topStudents = getTopStudents()
  const impayedStudents = studentsData.filter(s => s.status === "Impayé")

  const kpis = [
    {
      id: 'revenue',
      icon: DollarSign,
      title: 'Recettes Collectées',
      value: `${(stats.totalFeesCollected / 1000000).toFixed(2)}M`,
      unit: 'FCFA',
      color: 'green',
      detail: `${stats.percentageCollected}% du budget attendu`
    },
    {
      id: 'students',
      icon: Users,
      title: 'Effectif Total',
      value: stats.totalStudents,
      unit: 'élèves',
      color: 'blue',
      detail: `Inscriptions actives`
    },
    {
      id: 'performance',
      icon: TrendingUp,
      title: 'Performance Générale',
      value: stats.percentageCollected,
      unit: '%',
      color: 'purple',
      detail: `Taux de recouvrement`
    },
    {
      id: 'result',
      icon: BarChart3,
      title: 'Résultat Net du Mois',
      value: `${((stats.totalFeesCollected - 1250000) / 1000000).toFixed(2)}M`,
      unit: 'FCFA',
      color: stats.totalFeesCollected - 1250000 >= 0 ? 'blue' : 'red',
      detail: `Bénéfice / Déficit`
    }
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">Vue Stratégique</h1>
        <p className="text-gray-400 mt-2">Tableau de bord consolidé de votre établissement</p>
      </div>

      {/* Alertes critiques */}
      {impayedStudents.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg slide-in">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Actions requises</h3>
              <p className="text-red-700 mt-1">
                {impayedStudents.length} paiement(s) impayé(s) | {(stats.totalFeesRemaining / 1000000).toFixed(2)}M FCFA non collectés
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grille KPI cliquables (drill-down) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          const isExpanded = expandedPanel === kpi.id
          return (
            <button
              key={kpi.id}
              onClick={() => setExpandedPanel(isExpanded ? null : kpi.id)}
              className="stat-card text-left group hover:scale-105 transition-transform"
            >
              <div className={`bg-gradient-to-br from-${kpi.color}-50 to-${kpi.color}-100 text-${kpi.color}-600 rounded-lg p-3 w-fit mb-4`}>
                <Icon className="w-8 h-8" />
              </div>
              <h3 className="text-gray-600 text-sm font-medium">{kpi.title}</h3>
              <div className="flex items-baseline justify-between mt-2">
                <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                <span className="text-gray-500 text-sm ml-2">{kpi.unit}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{kpi.detail}</p>
              <div className="mt-3 text-xs text-blue-600 font-semibold group-hover:gap-1 flex items-center gap-0 transition-all">
                Cliquer pour détails →
              </div>
            </button>
          )
        })}
      </div>

      {/* Panneau de drill-down */}
      {expandedPanel && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 slide-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Détail: {kpis.find(k => k.id === expandedPanel)?.title}
            </h2>
            <button
              onClick={() => setExpandedPanel(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {expandedPanel === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Collecté</p>
                  <p className="text-2xl font-bold text-green-600">{(stats.totalFeesCollected / 1000000).toFixed(2)}M</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Attendu</p>
                  <p className="text-2xl font-bold text-orange-600">{(stats.totalFeesExpected / 1000000).toFixed(2)}M</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Reste dû</p>
                  <p className="text-2xl font-bold text-red-600">{(stats.totalFeesRemaining / 1000000).toFixed(2)}M</p>
                </div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Progression</p>
                <div className="w-full bg-gray-300 rounded-full h-6">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-500"
                    style={{ width: `${stats.percentageCollected}%` }}
                  >
                    {stats.percentageCollected}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedPanel === 'result' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Recettes (frais)</p>
                  <p className="text-2xl font-bold text-blue-600">{(stats.totalFeesCollected / 1000000).toFixed(2)}M</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Dépenses (masse salariale)</p>
                  <p className="text-2xl font-bold text-orange-600">1.25M</p>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 text-center">
                <p className="text-sm text-gray-600 mb-2">Résultat Net</p>
                <p className="text-3xl font-bold text-purple-600">
                  {((stats.totalFeesCollected - 1250000) / 1000000).toFixed(2)}M FCFA
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {stats.totalFeesCollected - 1250000 >= 0 ? '✓ Bénéfice' : '⚠ Déficit'}
                </p>
              </div>
            </div>
          )}

          {(expandedPanel === 'students' || expandedPanel === 'performance') && (
            <div className="space-y-4">
              <p className="text-gray-700">Vue détaillée disponible dans les modules spécialisés</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Élèves Actifs</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Taux Recouvrement</p>
                  <p className="text-2xl font-bold text-green-600">{stats.percentageCollected}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom sections - peut scroller */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopStudentsCard students={topStudents} />
        <FeeChartCard students={studentsData} />
      </div>
    </div>
  )
}
