import React, { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader, AlertCircle } from 'lucide-react'
import { apiClient } from '../api/client'
import { useDashboard } from '../hooks/useDashboard'

export default function AddStudentForm({ onBack, onSuccess }) {
  const { data: dashboardData, loading: dashLoading } = useDashboard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [classes, setClasses] = useState([])

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

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const data = await apiClient.getClasses()
      setClasses(data || [])
    } catch (err) {
      setError('Erreur chargement classes')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.matricule || !formData.nom || !formData.prenom || !formData.classeId) {
        setError('Champs obligatoires manquants')
        return
      }

      setLoading(true)
      await apiClient.createEleve(formData)

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

      if (onSuccess) onSuccess()
      alert('✅ Élève ajouté avec succès!')
    } catch (err) {
      setError(err.message || 'Erreur création élève')
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
        <h1 className="text-3xl font-bold text-white">➕ Ajouter un Élève</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="space-y-6">
          {/* Section Identité */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">👤 Identité</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Matricule *</label>
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  onChange={handleChange}
                  placeholder="EL2024001"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Dupont"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prénom *</label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Jean"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sexe</label>
                <select
                  name="sexe"
                  value={formData.sexe}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MASCULIN">Masculin</option>
                  <option value="FEMININ">Féminin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date de Naissance</label>
                <input
                  type="date"
                  name="dateNaissance"
                  value={formData.dateNaissance}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Classe *</label>
                <select
                  name="classeId"
                  value={formData.classeId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nom} ({cls.section})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section Parent/Tuteur */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">👨‍👩‍👧 Parent/Tuteur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom du Parent *</label>
                <input
                  type="text"
                  name="nomParent"
                  value={formData.nomParent}
                  onChange={handleChange}
                  placeholder="Nom du parent"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lien (Père, Mère, Tuteur...)</label>
                <select
                  name="lieuParente"
                  value={formData.lieuParente}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Père">Père</option>
                  <option value="Mère">Mère</option>
                  <option value="Tuteur">Tuteur</option>
                  <option value="Oncle">Oncle</option>
                  <option value="Tante">Tante</option>
                  <option value="Grand-parent">Grand-parent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone Parent *</label>
                <input
                  type="tel"
                  name="telephoneParent"
                  value={formData.telephoneParent}
                  onChange={handleChange}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Parent</label>
                <input
                  type="email"
                  name="emailParent"
                  value={formData.emailParent}
                  onChange={handleChange}
                  placeholder="parent@example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Adresse</label>
                <input
                  type="text"
                  name="adresseParent"
                  value={formData.adresseParent}
                  onChange={handleChange}
                  placeholder="Adresse du parent"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Boutons */}
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
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
