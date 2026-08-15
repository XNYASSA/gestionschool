import React, { useState } from 'react'
import { AlertTriangle, Loader } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { apiClient } from '../api/client'

export default function Attendance({ filters }) {
  const { data: dashboardData, loading, error } = useDashboard()
  const [presences, setPresences] = useState([])
  const [loadingPresences, setLoadingPresences] = useState(false)

  const students = dashboardData?.eleves || []

  React.useEffect(() => {
    loadPresences()
  }, [])

  const loadPresences = async () => {
    try {
      setLoadingPresences(true)
      const data = await apiClient.getPresences()
      setPresences(data || [])
    } catch (err) {
      console.error('Erreur chargement présences:', err)
    } finally {
      setLoadingPresences(false)
    }
  }

  const getAttendanceAlert = (rate) => {
    if (rate < 75) return { color: 'red', text: 'Alerte absentéisme' }
    if (rate < 85) return { color: 'orange', text: 'À surveiller' }
    return { color: 'green', text: 'Bon' }
  }

  const sortedByAttendance = students
    .map(student => {
      const studentPresences = presences.filter(p => p.eleveId === student.id)
      const presentDays = studentPresences.filter(p => p.statut === 'PRESENT').length
      const totalDays = studentPresences.length || 1
      const rate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0
      return {
        ...student,
        rate: parseFloat(rate.toFixed(1)),
        presentDays,
        totalDays
      }
    })
    .sort((a, b) => a.rate - b.rate)

  const alertedStudents = sortedByAttendance.filter(s => s.rate < 75)

  if (loading || loadingPresences) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Erreur: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-4xl font-bold text-gray-900">Suivi de Présence ({students.length} élèves)</h1>

      {/* Alertes absentéisme */}
      {alertedStudents.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg slide-in">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Absentéisme détecté</h3>
              <p className="text-red-700 mt-1">
                {alertedStudents.length} élève(s) avec un taux de présence inférieur à 75%
              </p>
              <div className="mt-3 space-y-1">
                {alertedStudents.map((student, idx) => (
                  <div key={student.id} className="text-sm text-red-600 bg-white px-2 py-1 rounded">
                    <p className="font-semibold">
                      {idx + 1}. {student.nom} {student.prenom} - {student.rate}% ({student.presentDays} jours / {student.totalDays})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau de présence */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left font-semibold text-gray-900">N°</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Élève</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Classe</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-900">Présences</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-900">Jours Total</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-900">Taux %</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sortedByAttendance.map((student, index) => {
                const alert = getAttendanceAlert(student.rate)
                const colorClasses = {
                  red: 'bg-red-100 text-red-800',
                  orange: 'bg-orange-100 text-orange-800',
                  green: 'bg-green-100 text-green-800'
                }
                return (
                  <tr
                    key={student.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {student.nom} {student.prenom}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{student.classe?.nom}</td>
                    <td className="px-6 py-4 text-center font-semibold text-green-600">
                      {student.presentDays}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">
                      {student.totalDays}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-lg text-gray-900">{student.rate}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colorClasses[alert.color]}`}>
                        {alert.text}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Taux moyen</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {sortedByAttendance.length > 0 ? (sortedByAttendance.reduce((sum, s) => sum + s.rate, 0) / sortedByAttendance.length).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Excellent (≥95%)</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {sortedByAttendance.filter(s => s.rate >= 95).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">À surveiller (75-85%)</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {sortedByAttendance.filter(s => s.rate >= 75 && s.rate < 85).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Alerte (&lt;75%)</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {sortedByAttendance.filter(s => s.rate < 75).length}
          </p>
        </div>
      </div>
    </div>
  )
}
