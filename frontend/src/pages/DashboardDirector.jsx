import React, { useState, useEffect } from 'react'
import { Users, DollarSign, TrendingUp, AlertCircle, ClipboardList, Check, X, Loader } from 'lucide-react'
import { formatFCFA, formatFCFALong } from '../utils/formatters'
import { apiClient } from '../api/client'
import { useDashboard } from '../hooks/useDashboard'

export default function DashboardDirector({ filters }) {
  const { data: dashboardData, loading, error } = useDashboard()

  // Données réelles de la base de données
  const students = dashboardData?.eleves || []
  const frais = dashboardData?.frais || []

  // Calculs à partir des vraies données
  const totalStudents = students.length
  const impayedStudents = frais.filter(f => f.statut === 'IMPAYE')
  const partialStudents = frais.filter(f => f.statut === 'PARTIEL')
  const totalFeesCollected = frais.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
  const totalFeesDue = frais.reduce((sum, f) => sum + (f.montantDu || 0), 0)
  const percentageCollected = totalFeesDue > 0 ? ((totalFeesCollected / totalFeesDue) * 100).toFixed(1) : 0

  if (loading) {
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">Tableau de Bord Directeur</h1>
        <p className="text-gray-400 mt-2">Suivi opérationnel - Données en temps réel</p>
        <div className="mt-3 inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">
          Accès Direction
        </div>
      </div>

      {/* Alertes critiques */}
      {impayedStudents.length > 0 && (
        <div className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-300">Paiements impayés détectés</h3>
              <p className="text-red-200 mt-1">
                {impayedStudents.length} élève(s) avec des frais impayés. Relances à effectuer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs opérationnels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total d'élèves */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Effectif Total</p>
              <p className="text-4xl font-bold mt-2">{totalStudents}</p>
              <p className="text-blue-200 text-xs mt-1">élèves inscrits</p>
            </div>
            <Users className="w-12 h-12 opacity-20" />
          </div>
        </div>

        {/* Frais collectés */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Frais Collectés</p>
              <p className="text-2xl font-bold mt-2">{formatFCFALong(totalFeesCollected)}</p>
              <p className="text-green-200 text-xs mt-1">{percentageCollected}% collecté</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-20" />
          </div>
        </div>

        {/* Paiements impayés */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Impayés</p>
              <p className="text-4xl font-bold mt-2">{impayedStudents.length}</p>
              <p className="text-red-200 text-xs mt-1">élèves en retard</p>
            </div>
            <AlertCircle className="w-12 h-12 opacity-20" />
          </div>
        </div>

        {/* Paiements partiels */}
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Paiements Partiels</p>
              <p className="text-4xl font-bold mt-2">{partialStudents.length}</p>
              <p className="text-yellow-200 text-xs mt-1">solde partiel</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-20" />
          </div>
        </div>
      </div>

      {/* Progression du recouvrement */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Progression du Recouvrement</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Collecté</span>
            <span className="font-semibold text-white">
              {formatFCFALong(totalFeesCollected)} / {formatFCFALong(totalFeesDue)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${percentageCollected}%` }}
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{percentageCollected}% du budget collecté</p>
            <p className="text-xs text-gray-400">Reste à recouvrer: {formatFCFALong(totalFeesDue - totalFeesCollected)}</p>
          </div>
        </div>
      </div>

      {/* Résumé des actions */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          Résumé des Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-lg">
            <p className="text-sm text-red-300 font-semibold">Paiements Impayés</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{impayedStudents.length}</p>
            <p className="text-xs text-red-300 mt-1">À relancer</p>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/30 p-4 rounded-lg">
            <p className="text-sm text-yellow-300 font-semibold">Paiements Partiels</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">{partialStudents.length}</p>
            <p className="text-xs text-yellow-300 mt-1">À compléter</p>
          </div>
          <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-lg">
            <p className="text-sm text-green-300 font-semibold">Frais Collectés</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{formatFCFALong(totalFeesCollected)}</p>
            <p className="text-xs text-green-300 mt-1">Encaissé</p>
          </div>
        </div>
      </div>

      {/* Tableau des impayés */}
      {impayedStudents.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-red-500/10">
            <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Élèves avec Frais Impayés ({impayedStudents.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700 border-b border-gray-600">
                  <th className="px-6 py-3 text-left font-semibold text-white">N°</th>
                  <th className="px-6 py-3 text-left font-semibold text-white">Élève</th>
                  <th className="px-6 py-3 text-left font-semibold text-white">Classe</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">Montant Dû</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">Payé</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">Restant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {impayedStudents.map((fee, idx) => {
                  const student = students.find(s => s.id === fee.eleveId)
                  return (
                    <tr key={fee.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-4 text-gray-300">
                        {student?.nom} {student?.prenom}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{student?.classe?.nom}</td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        {formatFCFALong(fee.montantDu || 0)}
                      </td>
                      <td className="px-6 py-4 text-right text-green-400 font-semibold">
                        {formatFCFALong(fee.montantPaye || 0)}
                      </td>
                      <td className="px-6 py-4 text-right text-red-400 font-semibold">
                        {formatFCFALong((fee.montantDu || 0) - (fee.montantPaye || 0))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message si tout est payé */}
      {impayedStudents.length === 0 && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-center">
          <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-green-300">Tous les paiements sont à jour!</h3>
          <p className="text-green-200 mt-1">Aucun frais impayé détecté.</p>
        </div>
      )}
    </div>
  )
}
