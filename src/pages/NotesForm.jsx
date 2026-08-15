import React, { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import { Save, X, AlertCircle } from 'lucide-react'

export default function NotesForm({ classeId, ecmId, matiere, enseignantId, onClose }) {
  const [trimestre, setTrimestre] = useState(1)
  const [eleves, setEleves] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Charger les élèves de la classe
  useEffect(() => {
    const fetchClasse = async () => {
      try {
        setLoading(true)
        const classe = await apiClient.getClasse(classeId)
        setEleves(classe.eleves || [])
        // Initialiser les notes avec les valeurs existantes
        const notesMap = {}
        eleves.forEach(e => {
          notesMap[e.id] = ''
        })
        setNotes(notesMap)
      } catch (err) {
        console.error('Erreur chargement classe:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasse()
  }, [classeId, eleves.length])

  const handleNoteChange = (eleveId, value) => {
    const floatVal = parseFloat(value) || ''
    if (floatVal === '' || (floatVal >= 0 && floatVal <= 20)) {
      setNotes(prev => ({ ...prev, [eleveId]: value }))
    }
  }

  const handleSubmit = async () => {
    if (!ecmId) {
      setError('Erreur: ECM non configuré')
      return
    }

    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      for (const [eleveId, valeur] of Object.entries(notes)) {
        if (valeur !== '') {
          await apiClient.createNote(eleveId, ecmId, trimestre, parseFloat(valeur))
        }
      }

      setSuccess(true)
      setTimeout(() => {
        onClose?.()
      }, 1500)
    } catch (err) {
      console.error('Erreur enregistrement notes:', err)
      setError(err.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const moyenne = Object.values(notes)
    .filter(n => n !== '')
    .map(n => parseFloat(n))
    .reduce((a, b) => a + b, 0) / Object.values(notes).filter(n => n !== '').length || 0

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-lg p-6">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">📝 Saisie des notes</h2>
            <p className="text-gray-400 text-sm mt-1">{matiere} • Trimestre {trimestre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Sélecteur trimestre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trimestre
            </label>
            <select
              value={trimestre}
              onChange={(e) => setTrimestre(parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            >
              <option value={1}>Trimestre 1</option>
              <option value={2}>Trimestre 2</option>
              <option value={3}>Trimestre 3</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Grille de notes */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-white">Élève</th>
                  <th className="px-4 py-3 text-center text-white w-24">Note /20</th>
                  <th className="px-4 py-3 text-center text-white w-32">Appréciation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {eleves.map(eleve => {
                  const note = notes[eleve.id] || ''
                  let appreciation = ''
                  if (note >= 18) appreciation = '⭐ Très Bien'
                  else if (note >= 15) appreciation = '✅ Bien'
                  else if (note >= 13) appreciation = '👍 Assez Bien'
                  else if (note >= 10) appreciation = '📚 Passable'
                  else if (note > 0) appreciation = '⚠️ Insuffisant'

                  return (
                    <tr key={eleve.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-gray-300 font-semibold">
                        {eleve.nom} {eleve.prenom}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={note}
                          onChange={(e) => handleNoteChange(eleve.id, e.target.value)}
                          className="w-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="0-20"
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">{appreciation}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Moyenne */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Moyenne de la classe</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{moyenne.toFixed(2)}/20</p>
          </div>

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg">
              ✓ Notes enregistrées avec succès!
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
                  Enregistrer les notes
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
