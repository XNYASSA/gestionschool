import React, { useState, useEffect } from 'react'
import { Settings, Lock, Loader } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { apiClient } from '../api/client'
import { formatFCFALong } from '../utils/formatters'

export default function SettingsPage() {
  const { data: dashboardData, loading, error } = useDashboard()
  const [configurationsFrais, setConfigurationsFrais] = useState([])
  const [sections, setSections] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [configsData, sectionsData] = await Promise.all([
        apiClient.getConfigurationsFrais(),
        apiClient.getSections()
      ])
      setConfigurationsFrais(configsData || [])
      setSections(sectionsData || [])
    } catch (err) {
      console.error('Erreur chargement paramètres:', err)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
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
      <h1 className="text-4xl font-bold text-gray-900">Paramètres</h1>

      {/* Avertissement */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex items-start">
          <Lock className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-blue-800">
            <span className="font-semibold">Configuration centralisée:</span> Modifiez les grilles de frais une seule fois ici. Tous les calculs, bulletins et rapports se mettront à jour automatiquement dans toute l'application.
          </p>
        </div>
      </div>

      {/* Grilles de Frais par Section */}
      <div className="space-y-6">
        {sections.map(section => {
          const config = configurationsFrais.find(c => c.sectionId === section.id)
          return (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Settings className="w-6 h-6 mr-2 text-blue-600" />
                Grille de Frais - {section.emoji} {section.nom}
              </h2>

              {config ? (
                <div className="space-y-6">
                  {/* Montants principaux */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold">Inscription</p>
                      <p className="text-2xl font-bold text-blue-600 mt-3">
                        {formatFCFALong(config.montantInscription)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold">Frais Total (Année)</p>
                      <p className="text-2xl font-bold text-green-600 mt-3">
                        {formatFCFALong(config.montantFraisTotal)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold">Nombre de Tranches</p>
                      <p className="text-2xl font-bold text-orange-600 mt-3">
                        {config.tranches?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Tranches détaillées */}
                  {config.tranches && config.tranches.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-4">Détail des Tranches</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {config.tranches.map((tranche, idx) => (
                          <div key={tranche.id} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-600 uppercase font-semibold">Tranche {tranche.numero}</p>
                            <p className="text-2xl font-bold text-blue-800 mt-3">
                              {formatFCFALong(tranche.montant)}
                            </p>
                            <div className="mt-3 text-xs text-blue-600">
                              <p>Pourcentage: {((tranche.montant / config.montantFraisTotal) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune configuration de frais pour cette section</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Informations de l'établissement */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-600" />
          Informations de l'Établissement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Nom de l'École</p>
            <p className="text-lg font-bold text-gray-900 mt-2">Collège Rosa-Parks</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Localisation</p>
            <p className="text-lg font-bold text-gray-900 mt-2">Yaoundé, Cameroun</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Année Scolaire</p>
            <p className="text-lg font-bold text-gray-900 mt-2">2024-2025</p>
          </div>
        </div>
      </div>

      {/* Sections gérées */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-600" />
          Sections Configurées ({sections.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map(section => (
            <div key={section.id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
              <p className="text-2xl mb-2">{section.emoji}</p>
              <p className="font-bold text-gray-900 text-lg">{section.nom}</p>
              <p className="text-xs text-gray-600 mt-2">ID: {section.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
