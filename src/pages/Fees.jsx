import React, { useState } from 'react'
import { DollarSign, Plus, Loader } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { apiClient } from '../api/client'
import { formatFCFALong } from '../utils/formatters'

export default function Fees({ filters }) {
  const { data: dashboardData, loading, error, refetch } = useDashboard()
  const [paymentForm, setPaymentForm] = useState({ studentId: '', amount: '', modePayement: 'Orange Money' })
  const [successMessage, setSuccessMessage] = useState('')
  const [loadingPayment, setLoadingPayment] = useState(false)

  const students = dashboardData?.eleves || []
  const frais = dashboardData?.frais || []

  const handlePayment = async (e) => {
    e.preventDefault()
    if (paymentForm.studentId && paymentForm.amount) {
      try {
        setLoadingPayment(true)
        await apiClient.enregistrerPaiement(paymentForm.studentId, parseInt(paymentForm.amount), paymentForm.modePayement)
        setSuccessMessage(`Paiement de ${formatFCFALong(parseInt(paymentForm.amount))} enregistré avec succès!`)
        setPaymentForm({ studentId: '', amount: '', modePayement: 'Orange Money' })
        // Recharger les données après un paiement
        await refetch()
        setTimeout(() => setSuccessMessage(''), 3000)
      } catch (err) {
        setSuccessMessage(`Erreur: ${err.message}`)
      } finally {
        setLoadingPayment(false)
      }
    }
  }

  const impayedStudents = students.filter(s => {
    const feeRecord = frais.find(f => f.eleveId === s.id)
    return feeRecord?.statut === 'IMPAYE'
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'SOLDE':
        return 'bg-green-100 text-green-800'
      case 'PARTIEL':
        return 'bg-yellow-100 text-yellow-800'
      case 'IMPAYE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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
      <h1 className="text-4xl font-bold text-white">Frais & Paiements ({students.length} élèves)</h1>

      {successMessage && (
        <div className={`border-l-4 p-4 rounded-lg slide-in ${successMessage.includes('Erreur') ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-green-500/20 border-green-500 text-green-300'}`}>
          <p className={`font-semibold`}>{successMessage}</p>
        </div>
      )}

      {/* Formulaire d'enregistrement de paiement */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-blue-400" />
          Enregistrer un Paiement
        </h2>
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Élève</label>
              <select
                value={paymentForm.studentId}
                onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner...</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.nom} {student.prenom} ({student.classe?.nom})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Montant (FCFA)</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="50000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mode de paiement</label>
              <select
                value={paymentForm.modePayement}
                onChange={(e) => setPaymentForm({ ...paymentForm, modePayement: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Orange Money">Orange Money</option>
                <option value="MTN MoMo">MTN MoMo</option>
                <option value="Wave">Wave</option>
                <option value="Espèces">Espèces</option>
                <option value="Virement Bancaire">Virement Bancaire</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loadingPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {loadingPayment ? '⏳...' : 'Valider'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tableau des frais */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-700">
          <h2 className="text-lg font-semibold text-white">Tableau des Frais</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700 border-b border-gray-600">
                <th className="px-6 py-3 text-left font-semibold text-white">N°</th>
                <th className="px-6 py-3 text-left font-semibold text-white">Élève</th>
                <th className="px-6 py-3 text-left font-semibold text-white">Classe</th>
                <th className="px-6 py-3 text-right font-semibold text-white">Frais</th>
                <th className="px-6 py-3 text-right font-semibold text-white">Payé</th>
                <th className="px-6 py-3 text-right font-semibold text-white">Restant</th>
                <th className="px-6 py-3 text-left font-semibold text-white">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {students.map((student, index) => {
                const feeRecord = frais.find(f => f.eleveId === student.id)
                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-700/50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-300">
                      {student.nom} {student.prenom}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{student.classe?.nom}</td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {formatFCFALong(feeRecord?.montantDu || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-400">
                      {formatFCFALong(feeRecord?.montantPaye || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-400">
                      {formatFCFALong((feeRecord?.montantDu || 0) - (feeRecord?.montantPaye || 0))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(feeRecord?.statut)}`}>
                        {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liste des relances */}
      {impayedStudents.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-red-500/20">
            <h2 className="text-lg font-semibold text-red-300 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Paiements Impayés ({impayedStudents.length} élèves)
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {impayedStudents.map((student, idx) => {
              const feeRecord = frais.find(f => f.eleveId === student.id)
              return (
                <div
                  key={student.id}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-300 text-lg">
                        {idx + 1}. {student.nom} {student.prenom}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Classe: {student.classe?.nom}
                      </p>
                      <p className="text-sm text-red-400 font-semibold mt-2">
                        Restant dû: {formatFCFALong((feeRecord?.montantDu || 0) - (feeRecord?.montantPaye || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
