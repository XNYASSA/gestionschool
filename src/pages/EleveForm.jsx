import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { apiClient } from '../api/client'
import { Save, X, AlertCircle } from 'lucide-react'

export default function EleveForm({ eleveId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)

  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    sexe: 'MASCULIN',
    dateNaissance: '',
    classeId: '',
    nomParent: '',
    lieuParente: 'Père',
    telephoneParent: '',
    emailParent: '',
    adresseParent: ''
  })

  // Charger les classes disponibles
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/classes', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.ok) {
          const data = await response.json()
          setClasses(data || [])
        }
      } catch (err) {
        console.error('Erreur chargement classes:', err)
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [])

  // Charger l'élève si édition
  useEffect(() => {
    if (eleveId) {
      const fetchEleve = async () => {
        try {
          const eleve = await apiClient.getEleve(eleveId)
          setFormData({
            matricule: eleve.matricule,
            nom: eleve.nom,
            prenom: eleve.prenom,
            sexe: eleve.sexe,
            dateNaissance: eleve.dateNaissance.split('T')[0],
            classeId: eleve.classeId,
            nomParent: eleve.nomParent,
            lieuParente: eleve.lieuParente || 'Père',
            telephoneParent: eleve.telephoneParent,
            emailParent: eleve.emailParent || '',
            adresseParent: eleve.adresseParent || ''
          })
        } catch (err) {
          setError('Erreur chargement élève')
        }
      }
      fetchEleve()
    }
  }, [eleveId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      if (eleveId) {
        // Mise à jour
        await apiClient.updateEleve(eleveId, formData)
        setSuccess(true)
      } else {
        // Création
        await apiClient.createEleve(formData)
        setSuccess(true)
        // Réinitialiser le formulaire après création
        setTimeout(() => {
          setFormData({
            matricule: '',
            nom: '',
            prenom: '',
            sexe: 'MASCULIN',
            dateNaissance: '',
            classeId: '',
            nomParent: '',
            lieuParente: 'Père',
            telephoneParent: '',
            emailParent: '',
            adresseParent: ''
          })
          onSuccess?.()
        }, 1500)
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {eleveId ? '✏️ Modifier élève' : '➕ Nouvel élève'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg">
              ✓ {eleveId ? 'Élève modifié' : 'Élève créé'} avec succès!
            </div>
          )}

          {/* DONNÉES ÉLÈVE */}
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Données de l'élève</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Matricule <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. MAT001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Classe <span className="text-red-500">*</span>
                </label>
                <select
                  name="classeId"
                  value={formData.classeId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loadingClasses}
                >
                  <option value="">Sélectionner une classe...</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nom} ({cls.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. KENGNI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. Nadia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Sexe <span className="text-red-500">*</span>
                </label>
                <select
                  name="sexe"
                  value={formData.sexe}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="MASCULIN">Masculin</option>
                  <option value="FEMININ">Féminin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Date de naissance <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateNaissance"
                  value={formData.dateNaissance}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* DONNÉES PARENT/TUTEUR */}
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-4">Parent/Tuteur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nomParent"
                  value={formData.nomParent}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. M. Jean KENGNI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Lien de parenté <span className="text-red-500">*</span>
                </label>
                <select
                  name="lieuParente"
                  value={formData.lieuParente}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Père">Père</option>
                  <option value="Mère">Mère</option>
                  <option value="Tuteur">Tuteur</option>
                  <option value="Oncle">Oncle</option>
                  <option value="Tante">Tante</option>
                  <option value="Grand-mère">Grand-mère</option>
                  <option value="Grand-père">Grand-père</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="telephoneParent"
                  value={formData.telephoneParent}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. +237 670 123 456"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  name="emailParent"
                  value={formData.emailParent}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. parent@email.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Adresse (optionnelle)
                </label>
                <input
                  type="text"
                  name="adresseParent"
                  value={formData.adresseParent}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. Yaoundé, Bastos"
                />
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {eleveId ? 'Modifier' : 'Créer'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
