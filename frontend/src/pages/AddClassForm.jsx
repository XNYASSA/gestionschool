import React, { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader, AlertCircle, Plus } from 'lucide-react'
import { apiClient } from '../api/client'

export default function AddClassForm({ onBack, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sections, setSections] = useState([])
  const [createdClasses, setCreatedClasses] = useState([])

  const [formData, setFormData] = useState({
    nom: '',
    section: '',
    sectionId: '',
    niveau: ''
  })

  useEffect(() => {
    loadSections()
    loadClasses()
  }, [])

  const loadSections = async () => {
    try {
      const data = await apiClient.getSections()
      setSections(data || [])
    } catch (err) {
      setError('Erreur chargement sections')
    }
  }

  const loadClasses = async () => {
    try {
      const data = await apiClient.getClasses()
      setCreatedClasses(data || [])
    } catch (err) {
      console.error('Erreur chargement classes')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'section') {
      const selectedSection = sections.find(s => s.nom === value)
      setFormData(prev => ({
        ...prev,
        section: value,
        sectionId: selectedSection?.id || ''
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.nom || !formData.section || !formData.niveau) {
        setError('Tous les champs sont obligatoires')
        return
      }

      setLoading(true)
      const newClass = await apiClient.createClasse(
        formData.nom,
        formData.section,
        formData.sectionId,
        formData.niveau
      )

      setCreatedClasses([...createdClasses, newClass])
      setFormData({ nom: '', section: '', sectionId: '', niveau: '' })
      setError(null)

      if (onSuccess) onSuccess()
      alert('✅ Classe créée avec succès!')
    } catch (err) {
      setError(err.message || 'Erreur création classe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-300" />
        </button>
        <h1 className="text-3xl font-bold text-white">➕ Ajouter une Classe</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Section *</label>
            <select
              name="section"
              value={formData.section}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner une section</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.nom}>
                  {sec.emoji} {sec.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom de la Classe *</label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Ex: 6ème A, Form 1, 2nde Informatique"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Niveau *</label>
            <input
              type="text"
              name="niveau"
              value={formData.niveau}
              onChange={handleChange}
              placeholder="Ex: 6ème, Form 1, 2nde"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Créer la classe
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Afficher les classes créées dans cette session */}
      {createdClasses.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📚 Classes existantes ({createdClasses.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {createdClasses.map(cls => (
              <div key={cls.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <p className="font-semibold text-white">{cls.nom}</p>
                <p className="text-sm text-gray-400">{cls.section} • {cls.niveau}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
