import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { apiClient } from '../api/client'
import { BookOpen, Users, CheckCircle2 } from 'lucide-react'
import NotesForm from './NotesForm'
import PresenceForm from './PresenceForm'

export default function TeacherPage() {
  const { user } = useContext(AuthContext)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNotesForm, setShowNotesForm] = useState(false)
  const [showPresenceForm, setShowPresenceForm] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedEcmId, setSelectedEcmId] = useState(null)

  // Charger les classes de l'enseignant
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true)
        // Récupérer le dashboard qui contient les classes de l'enseignant
        const dashboard = await apiClient.getDashboard()

        // Charger les classes avec leurs élèves
        if (dashboard.mesClasses && dashboard.mesClasses.length > 0) {
          const classesWithEleves = await Promise.all(
            dashboard.mesClasses.map(async (classInfo) => {
              try {
                const classe = await apiClient.getClasse(classInfo.classeId)
                return {
                  ...classe,
                  matiere: classInfo.matiere,
                  ecmId: classInfo.ecmId
                }
              } catch (err) {
                console.error(`Erreur chargement classe ${classInfo.classeId}:`, err)
                return null
              }
            })
          )
          setClasses(classesWithEleves.filter(Boolean))
        }
      } catch (err) {
        console.error('Erreur chargement classes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  const handleOpenNotes = (classe) => {
    setSelectedClass(classe)
    setSelectedClassId(classe.id)
    setSelectedEcmId(classe.ecmId)
    setShowNotesForm(true)
  }

  const handleOpenPresence = (classe) => {
    setSelectedClass(classe)
    setSelectedClassId(classe.id)
    setShowPresenceForm(true)
  }

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Chargement de vos classes...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold text-white">👨‍🏫 Enseignant</h1>
        <p className="text-gray-400 mt-2">Saisie des notes et présences</p>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-xs font-medium">Mes classes</p>
              <p className="text-2xl font-bold mt-1">{classes.length}</p>
            </div>
            <BookOpen className="w-8 h-8 opacity-20 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-xs font-medium">Total élèves</p>
              <p className="text-2xl font-bold mt-1">
                {classes.reduce((sum, c) => sum + (c.eleves?.length || 0), 0)}
              </p>
            </div>
            <Users className="w-8 h-8 opacity-20 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-orange-100 text-xs font-medium">Actions</p>
              <p className="text-2xl font-bold mt-1">2</p>
              <p className="text-orange-200 text-xs mt-1">Saisies</p>
            </div>
            <CheckCircle2 className="w-8 h-8 opacity-20 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Mes classes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">📚 Mes classes</h2>

        {classes.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400">Aucune classe assignée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(classe => (
              <div
                key={classe.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-all"
              >
                {/* Entête classe */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">{classe.nom}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-semibold">
                      {classe.section}
                    </span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      {classe.matiere}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-6 pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Élèves</span>
                    <span className="text-white font-semibold">{classe.eleves?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Niveau</span>
                    <span className="text-white font-semibold">{classe.niveau}</span>
                  </div>
                </div>

                {/* Boutons actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenNotes(classe)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Notes
                  </button>
                  <button
                    onClick={() => handleOpenPresence(classe)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Présences
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNotesForm && selectedClassId && (
        <NotesForm
          classeId={selectedClassId}
          ecmId={selectedEcmId}
          matiere={selectedClass?.matiere}
          enseignantId={user?.id}
          onClose={() => {
            setShowNotesForm(false)
            setSelectedClass(null)
            setSelectedEcmId(null)
          }}
        />
      )}

      {showPresenceForm && selectedClassId && (
        <PresenceForm
          classeId={selectedClassId}
          onClose={() => {
            setShowPresenceForm(false)
            setSelectedClass(null)
          }}
        />
      )}
    </div>
  )
}
