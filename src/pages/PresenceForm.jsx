import React, { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import { Save, X, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

export default function PresenceForm({ classeId, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [eleves, setEleves] = useState([])
  const [presences, setPresences] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Charger les élèves de la classe
  useEffect(() => {
    const fetchClasse = async () => {
      try {
        setLoading(true)
        const classe = await apiClient.getClasse(classeId)
        setEleves(classe.eleves || [])
        // Initialiser avec PRESENT pour tous
        const presencesMap = {}
        classe.eleves?.forEach(e => {
          presencesMap[e.id] = 'PRESENT'
        })
        setPresences(presencesMap)
      } catch (err) {
        console.error('Erreur chargement classe:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasse()
  }, [classeId])

  const togglePresence = (eleveId) => {
    setPresences(prev => {
      const current = prev[eleveId] || 'PRESENT'
      const next = current === 'PRESENT' ? 'ABSENT' : current === 'ABSENT' ? 'JUSTIFIE' : 'PRESENT'
      return { ...prev, [eleveId]: next }
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    setSuccess(false)
    try {
      for (const [eleveId, statut] of Object.entries(presences)) {
        await apiClient.enregistrerPresence(eleveId, classeId, new Date(date), statut)
      }
      setSuccess(true)
      setTimeout(() => {
        onClose?.()
      }, 1500)
    } catch (err) {
      console.error('Erreur enregistrement présences:', err)
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    present: Object.values(presences).filter(p => p === 'PRESENT').length,
    absent: Object.values(presences).filter(p => p === 'ABSENT').length,
    justifie: Object.values(presences).filter(p => p === 'JUSTIFIE').length
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-lg p-6">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">✅ Enregistrement des présences</h2>
            <p className="text-gray-400 text-sm mt-1">Cliquez sur les élèves pour changer leur statut</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Sélecteur date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <p className="text-green-400 font-semibold">{stats.present}</p>
              <p className="text-gray-400 text-sm">Présents</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-red-400 font-semibold">{stats.absent}</p>
              <p className="text-gray-400 text-sm">Absents</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
              <p className="text-yellow-400 font-semibold">{stats.justifie}</p>
              <p className="text-gray-400 text-sm">Justifiés</p>
            </div>
          </div>

          {/* Grille d'élèves */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eleves.map(eleve => {
              const statut = presences[eleve.id] || 'PRESENT'
              const colors = {
                PRESENT: 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30',
                ABSENT: 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30',
                JUSTIFIE: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30'
              }
              const icons = {
                PRESENT: <CheckCircle2 className="w-5 h-5 text-green-400" />,
                ABSENT: <XCircle className="w-5 h-5 text-red-400" />,
                JUSTIFIE: <HelpCircle className="w-5 h-5 text-yellow-400" />
              }

              return (
                <button
                  key={eleve.id}
                  onClick={() => togglePresence(eleve.id)}
                  className={`border-2 rounded-lg p-4 text-left transition-all ${colors[statut]}`}
                >
                  <div className="flex items-center gap-3">
                    <div>{icons[statut]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{eleve.nom} {eleve.prenom}</p>
                      <p className="text-gray-400 text-xs">{statut === 'PRESENT' ? '✓ Présent' : statut === 'ABSENT' ? '✗ Absent' : '? Justifié'}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg">
              ✓ Présences enregistrées avec succès!
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Valider
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
