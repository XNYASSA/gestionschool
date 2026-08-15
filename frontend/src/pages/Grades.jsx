import React, { useState } from 'react'
import { FileText, Download, Loader } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { apiClient } from '../api/client'

export default function Grades({ filters }) {
  const { data: dashboardData, loading, error } = useDashboard()
  const [notes, setNotes] = useState([])
  const [matieres, setMatieres] = useState([])
  const [sections, setSections] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [searchName, setSearchName] = useState('')

  const students = dashboardData?.eleves || []

  React.useEffect(() => {
    loadData()
  }, [])

  React.useEffect(() => {
    if (dashboardData?.eleves) {
      const uniqueClasses = {}
      dashboardData.eleves.forEach(student => {
        if (student.classe && !uniqueClasses[student.classe.id]) {
          uniqueClasses[student.classe.id] = student.classe
        }
      })
      setClasses(Object.values(uniqueClasses))
    }
  }, [dashboardData])

  const loadData = async () => {
    try {
      const [notesData, matieresData, sectionsData] = await Promise.all([
        apiClient.getNotes(),
        apiClient.getMatieres(),
        apiClient.getSections()
      ])
      setNotes(notesData || [])
      setMatieres(matieresData || [])
      setSections(sectionsData || [])
    } catch (err) {
      console.error('Erreur chargement notes:', err)
    }
  }

  const getStudentAverage = (studentId) => {
    const studentNotes = notes.filter(n => n.eleveId === studentId)
    if (studentNotes.length === 0) return 0
    const weighted = studentNotes.reduce((sum, n) => {
      const matiere = matieres.find(m => m.id === n.matiereId)
      return sum + (n.valeur * (matiere?.coefficient || 1))
    }, 0) / studentNotes.reduce((sum, n) => {
      const matiere = matieres.find(m => m.id === n.matiereId)
      return sum + (matiere?.coefficient || 1)
    }, 1)
    return weighted.toFixed(2)
  }

  const getStudentMention = (average) => {
    if (average < 10) return "Insuffisant"
    if (average < 13) return "Passable"
    if (average < 15) return "Assez Bien"
    if (average < 18) return "Bien"
    return "Très Bien"
  }

  const selectedStudent = selectedStudentId ? students.find(s => s.id === selectedStudentId) : null
  const studentNotes = selectedStudentId ? notes.filter(n => n.eleveId === selectedStudentId) : []
  const studentAverage = selectedStudentId ? parseFloat(getStudentAverage(selectedStudentId)) : 0
  const studentMention = selectedStudentId ? getStudentMention(studentAverage) : ''

  const getMentionColor = (mention) => {
    switch (mention) {
      case 'Très Bien':
        return 'text-green-600 bg-green-100'
      case 'Bien':
        return 'text-blue-600 bg-blue-100'
      case 'Assez Bien':
        return 'text-yellow-600 bg-yellow-100'
      case 'Passable':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-red-600 bg-red-100'
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
      <h1 className="text-4xl font-bold text-gray-900">Notes & Bulletins ({students.length} élèves)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filtres cascadants */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Filtrer Élève</h2>

          {/* Filtre Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value)
                setSelectedClass('')
                setSelectedStudentId(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les sections</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.nom}>
                  {sec.emoji} {sec.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Classe */}
          {selectedSection && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Classe</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value)
                  setSelectedStudentId(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les classes</option>
                {classes.filter(c => c.section?.toUpperCase() === selectedSection?.toUpperCase()).map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtre Nom */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom Élève</label>
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value)
                setSelectedStudentId(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Liste élèves filtrés */}
          {(selectedSection || searchName) && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Élèves trouvés</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {students
                  .filter(s => {
                    const matchSection = !selectedSection || s.classe?.section?.toUpperCase() === selectedSection?.toUpperCase()
                    const matchClass = !selectedClass || s.classe?.id === selectedClass
                    const matchName = !searchName || `${s.nom} ${s.prenom}`.toLowerCase().includes(searchName.toLowerCase())
                    return matchSection && matchClass && matchName
                  })
                  .map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedStudentId === student.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="font-semibold">{student.nom} {student.prenom}</div>
                      <div className="text-xs opacity-75">{student.classe?.nom}</div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {selectedStudent && (
            <div className="space-y-4 mt-6 p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 uppercase">Classe</p>
                <p className="font-semibold text-gray-900">{selectedStudent.classe?.nom}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase">Section</p>
                <p className="font-semibold text-gray-900">{selectedStudent.classe?.section}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-600 uppercase">Moyenne Générale</p>
                <p className="text-3xl font-bold text-blue-600">{studentAverage}/20</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase">Mention</p>
                <p className={`font-bold px-3 py-1 rounded-full text-sm ${getMentionColor(studentMention)}`}>
                  {studentMention}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notes détaillées */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes par Matière ({studentNotes.length})</h2>
                <div className="space-y-3">
                  {studentNotes.length > 0 ? (
                    studentNotes.map((noteRecord, idx) => {
                      const matiere = matieres.find(m => m.id === noteRecord.matiereId)
                      return (
                        <div
                          key={noteRecord.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{idx + 1}. {matiere?.nom}</p>
                            <p className="text-xs text-gray-500">Coefficient: {matiere?.coefficient || 1}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{noteRecord.valeur}/20</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucune note disponible</p>
                  )}
                </div>
              </div>

              {/* Bulletin stylisé */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border border-gray-200 p-8">
                <div className="text-center mb-6 pb-6 border-b-2 border-blue-200">
                  <p className="text-sm uppercase tracking-wider text-gray-600 font-semibold">Collège Rosa-Parks • Yaoundé</p>
                  <h2 className="text-3xl font-bold text-gray-900 mt-2">BULLETIN SCOLAIRE</h2>
                  <p className="text-gray-600 mt-1">Trimestre / Semestre 2024-2025</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Élève:</p>
                      <p className="font-bold text-lg text-gray-900">{selectedStudent.nom} {selectedStudent.prenom}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Classe:</p>
                      <p className="font-bold text-lg text-gray-900">{selectedStudent.classe?.nom}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Section:</p>
                      <p className="font-bold text-lg text-gray-900">{selectedStudent.classe?.section}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date de Naissance:</p>
                      <p className="font-bold text-lg text-gray-900">{selectedStudent.dateNaissance || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6 p-4 bg-white rounded-lg">
                  {studentNotes.length > 0 ? (
                    studentNotes.map((noteRecord, idx) => {
                      const matiere = matieres.find(m => m.id === noteRecord.matiereId)
                      return (
                        <div key={noteRecord.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{idx + 1}. {matiere?.nom}</span>
                          <span className="font-semibold text-gray-900">{noteRecord.valeur}/20</span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-2">Aucune note</p>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4 text-center border-2 border-blue-200 mb-6">
                  <p className="text-xs text-gray-600 uppercase">Moyenne Générale</p>
                  <p className="text-4xl font-bold text-blue-600 my-2">{studentAverage}/20</p>
                  <p className={`text-lg font-bold ${getMentionColor(studentMention)}`}>
                    {studentMention}
                  </p>
                </div>

                <div className="text-center text-xs text-gray-600 mt-4 pt-4 border-t border-gray-200">
                  <p>Appréciation du directeur: À continuer vos efforts</p>
                  <p className="mt-2 font-semibold">Collège Rosa-Parks</p>
                </div>
              </div>

              {/* Bouton exporter */}
              <button className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Exporter en PDF
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Sélectionnez un élève pour voir son bulletin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
