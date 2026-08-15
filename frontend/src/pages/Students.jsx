import React, { useState } from 'react'
import { Search, Eye, Loader } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { apiClient } from '../api/client'
import { formatFCFALong } from '../utils/formatters'

export default function Students({ filters }) {
  const { data: dashboardData, loading, error } = useDashboard()
  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [sections, setSections] = useState([])

  const students = dashboardData?.eleves || []
  const frais = dashboardData?.frais || []

  React.useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    try {
      const sectionsData = await apiClient.getSections()
      setSections(sectionsData || [])
    } catch (err) {
      console.error('Erreur chargement sections:', err)
    }
  }

  const filtered = students.filter(student => {
    const feeRecord = frais.find(f => f.eleveId === student.id)
    const matchSearch = student.nom.toLowerCase().includes(search.toLowerCase()) ||
                        student.prenom.toLowerCase().includes(search.toLowerCase()) ||
                        student.classe?.nom.toLowerCase().includes(search.toLowerCase())
    const matchSection = filterSection === 'all' || student.classe?.section?.toUpperCase() === filterSection?.toUpperCase()
    const matchStatus = filterStatus === 'all' || feeRecord?.statut === filterStatus
    return matchSearch && matchSection && matchStatus
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
      <h1 className="text-4xl font-bold text-gray-900">Élèves ({students.length})</h1>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtre section */}
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toutes les sections</option>
            {sections.map(sec => (
              <option key={sec.id} value={sec.nom}>
                {sec.emoji} {sec.nom}
              </option>
            ))}
          </select>

          {/* Filtre statut */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="SOLDE">Soldé</option>
            <option value="PARTIEL">Partiel</option>
            <option value="IMPAYE">Impayé</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left font-semibold text-gray-900">N°</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Élève</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Classe</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Section</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">Frais Dû</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">Payé</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Statut</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, index) => {
                const feeRecord = frais.find(f => f.eleveId === student.id)
                return (
                  <tr
                    key={student.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-500 w-12">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        {student.nom} {student.prenom}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{student.classe?.nom}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {student.classe?.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700 font-semibold">
                      {formatFCFALong(feeRecord?.montantDu || 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600 font-semibold">
                      {formatFCFALong(feeRecord?.montantPaye || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(feeRecord?.statut)}`}>
                        {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>Aucun élève trouvé ({students.length} élève{students.length > 1 ? 's' : ''} au total)</p>
          </div>
        )}
      </div>

      {/* Fiche détail élève */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedStudent.nom} {selectedStudent.prenom}
              </h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Infos générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Classe</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedStudent.classe?.nom}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Section</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedStudent.classe?.section}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Date de Naissance</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedStudent.dateNaissance || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Lieu de Naissance</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedStudent.lieuNaissance || 'N/A'}</p>
                </div>
              </div>

              {/* Adresse et Contact */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Adresse et Contact</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Adresse</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.adresse || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Parent/Tuteur</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.nomParent || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Téléphone</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.telephoneParent || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Frais */}
              {(() => {
                const feeRecord = frais.find(f => f.eleveId === selectedStudent.id)
                return (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Frais de scolarité</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Frais Total Dû</span>
                        <span className="font-semibold">{formatFCFALong(feeRecord?.montantDu || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Montant Payé</span>
                        <span className="font-semibold text-green-600">{formatFCFALong(feeRecord?.montantPaye || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-600">Restant Dû</span>
                        <span className={`font-semibold ${(feeRecord?.montantDu || 0) - (feeRecord?.montantPaye || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatFCFALong((feeRecord?.montantDu || 0) - (feeRecord?.montantPaye || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Statut */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Statut de paiement</h3>
                {(() => {
                  const feeRecord = frais.find(f => f.eleveId === selectedStudent.id)
                  return (
                    <span className={`inline-block px-4 py-2 rounded-full font-medium ${getStatusColor(feeRecord?.statut)}`}>
                      {feeRecord?.statut === 'SOLDE' ? 'Soldé' : feeRecord?.statut === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
