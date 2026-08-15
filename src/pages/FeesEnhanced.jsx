import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { DollarSign, Plus, Phone } from 'lucide-react'
import { formatFCFALong } from '../utils/formatters'
import SectionSelector from '../components/SectionSelector'
import ClassSelector from '../components/ClassSelector'

export default function FeesEnhanced({ filters }) {
  const { studentsData, recordPayment, paymentMethods } = useContext(AppContext)
  const [paymentForm, setPaymentForm] = useState({ studentId: '', amount: '', method: 'Orange Money' })
  const [successMessage, setSuccessMessage] = useState('')

  // Navigation hiérarchique
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)

  const getClassesBySection = (section) => {
    const sectionMap = {
      francophone: ['6ème A', '5ème B', '4ème A', '3ème A', '2nde A', '1ère S', 'Terminale D'],
      anglophone: ['Form 1 B', 'Form 2 A', 'Form 3 A'],
      technique: ['Tech 1', 'Tech 2']
    }
    return sectionMap[section] || []
  }

  const getStudentsByClass = (className) => {
    return studentsData.filter(s => s.class === className)
  }

  const handlePayment = (e) => {
    e.preventDefault()
    if (paymentForm.studentId && paymentForm.amount) {
      recordPayment(parseInt(paymentForm.studentId), parseInt(paymentForm.amount), paymentForm.method)
      setSuccessMessage(`Paiement de ${formatFCFALong(parseInt(paymentForm.amount))} enregistré avec succès!`)
      setPaymentForm({ studentId: '', amount: '', method: 'Orange Money' })
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Soldé':
        return 'bg-green-100 text-green-800'
      case 'Partiel':
        return 'bg-yellow-100 text-yellow-800'
      case 'Impayé':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const impayedStudents = studentsData.filter(s => s.status === "Impayé")

  if (!selectedSection) {
    return (
      <div className="space-y-6 fade-in">
        <h1 className="text-4xl font-bold text-white">Frais & Paiements</h1>

        <SectionSelector
          selectedSection={selectedSection}
          onSelectSection={setSelectedSection}
        />

        {/* Bouton pour voir tous les frais */}
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={() => setSelectedSection('all')}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105"
          >
            <p className="text-lg font-bold">💰 Voir Tous les Frais & Paiements</p>
            <p className="text-white/70 text-sm mt-2">Affichage complet de tous les élèves</p>
          </button>
        </div>
      </div>
    )
  }

  if (selectedSection === 'all') {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Tous les Frais & Paiements</h1>
          <button
            onClick={() => setSelectedSection(null)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Retour
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-500/20 border-l-4 border-green-500 p-4 rounded-lg slide-in">
            <p className="text-green-300 font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Formulaire d'enregistrement */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner...</option>
                  {studentsData.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.class})
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Mode de paiement</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Valider
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tableau complet */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
            <h3 className="text-lg font-semibold text-white">Tableau des Frais - Tous les Élèves</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-white">Élève</th>
                  <th className="px-6 py-3 text-left font-semibold text-white">Classe</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">Frais</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">Payé</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">Restant</th>
                  <th className="px-6 py-3 text-left font-semibold text-white">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {studentsData.map(student => (
                  <tr key={student.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-300">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{student.class}</td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {formatFCFALong(student.registrationFee)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-400">
                      {formatFCFALong(student.paid)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-400">
                      {formatFCFALong(student.registrationFee - student.paid)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        student.status === 'Soldé' ? 'bg-green-500/20 text-green-400' :
                        student.status === 'Partiel' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Relances */}
        {impayedStudents.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-red-900/50 border-b border-red-600">
              <h2 className="text-lg font-semibold text-red-300 flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Relances - {impayedStudents.length} Impayés
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {impayedStudents.map(student => (
                <div key={student.id} className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-200 text-lg">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">Parent: {student.parentName}</p>
                      <p className="text-sm text-red-400 font-semibold mt-2">
                        Restant dû: {formatFCFALong(student.registrationFee - student.paid)}
                      </p>
                    </div>
                    <a
                      href={`tel:${student.parentPhone}`}
                      className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{student.parentPhone}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!selectedClass) {
    return (
      <div className="space-y-6 fade-in">
        <button
          onClick={() => setSelectedSection(null)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ← Retour
        </button>
        <ClassSelector
          section={selectedSection}
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          classes={getClassesBySection(selectedSection)}
        />
      </div>
    )
  }

  // Affichage pour une classe spécifique
  return (
    <div className="space-y-6 fade-in">
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedSection(null)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ← Sections
        </button>
        <button
          onClick={() => setSelectedClass(null)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ← Retour à {selectedSection}
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          Frais & Paiements - {selectedClass}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-white">Élève</th>
                <th className="px-4 py-3 text-right text-white">Frais Total</th>
                <th className="px-4 py-3 text-right text-white">Payé</th>
                <th className="px-4 py-3 text-right text-white">Restant</th>
                <th className="px-4 py-3 text-left text-white">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {getStudentsByClass(selectedClass).map(student => (
                <tr key={student.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300 font-semibold">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatFCFALong(student.registrationFee)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-semibold">
                    {formatFCFALong(student.paid)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-400 font-semibold">
                    {formatFCFALong(student.registrationFee - student.paid)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      student.status === 'Soldé' ? 'bg-green-500/20 text-green-400' :
                      student.status === 'Partiel' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
