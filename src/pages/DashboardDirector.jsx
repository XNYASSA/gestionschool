import React, { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { Users, DollarSign, TrendingUp, AlertCircle, ClipboardList, Check, X } from 'lucide-react'
import StatCard from '../components/StatCard'
import TopStudentsCard from '../components/TopStudentsCard'
import FeeChartCard from '../components/FeeChartCard'
import { formatFCFA, formatFCFALong } from '../utils/formatters'
import { apiClient } from '../api/client'

export default function DashboardDirector({ filters }) {
  const { getStatistics, getTopStudents, studentsData } = useContext(AppContext)
  const stats = getStatistics()
  const topStudents = getTopStudents()
  const impayedStudents = studentsData.filter(s => s.status === "Impayé")

  const [paiementsAttente, setPaiementsAttente] = useState([])
  const [loadingPaiements, setLoadingPaiements] = useState(true)
  const [validatingId, setValidatingId] = useState(null)

  // Charger les paiements en attente de validation
  useEffect(() => {
    const fetchPaiements = async () => {
      try {
        setLoadingPaiements(true)
        const data = await apiClient.getFrais()
        const enAttente = data.filter(f => f.statutValidation === 'BROUILLON')
        setPaiementsAttente(enAttente)
      } catch (err) {
        console.error('Erreur chargement paiements:', err)
      } finally {
        setLoadingPaiements(false)
      }
    }
    fetchPaiements()
  }, [])

  const handleValiderPaiement = async (paiementId, statut) => {
    setValidatingId(paiementId)
    try {
      await apiClient.validerPaiement(paiementId, statut)
      // Retirer de la liste
      setPaiementsAttente(prev => prev.filter(p => p.id !== paiementId))
    } catch (err) {
      console.error('Erreur validation paiement:', err)
      alert('Erreur: ' + (err.message || 'Impossible de valider'))
    } finally {
      setValidatingId(null)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">Tableau de Bord Directeur</h1>
        <p className="text-gray-400 mt-2">Suivi opérationnel et validation des processus</p>
        <div className="mt-3 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
          Accès Direction
        </div>
      </div>

      {/* Alertes critiques */}
      {impayedStudents.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg slide-in">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Paiements impayés détectés</h3>
              <p className="text-red-700 mt-1">
                {impayedStudents.length} élève(s) avec des frais impayés. Relances à effectuer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs opérationnels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-8 h-8" />}
          title="Effectif Total"
          value={stats.totalStudents}
          unit="élèves"
          color="blue"
        />
        <StatCard
          icon={<DollarSign className="w-8 h-8" />}
          title="Frais Collectés"
          value={formatFCFALong(stats.totalFeesCollected || 0)}
          unit=""
          color="green"
          percentage={stats.percentageCollected}
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8" />}
          title="Taux de Présence"
          value={stats.attendanceRate}
          unit="%"
          color="purple"
        />
        <StatCard
          icon={<AlertCircle className="w-8 h-8" />}
          title="À Traiter"
          value={impayedStudents.length + stats.failedStudents}
          unit="éléments"
          color="orange"
        />
      </div>

      {/* Barre de progression des frais */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 slide-in">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progression du Recouvrement</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Collecté</span>
            <span className="font-semibold text-gray-900">
              {formatFCFALong(stats.totalFeesCollected || 0)} / {formatFCFALong(stats.totalFeesExpected || 0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentageCollected}%` }}
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{stats.percentageCollected}% du budget collecté</p>
            <p className="text-xs text-gray-500">Reste à recouvrer: {formatFCFALong(stats.totalFeesRemaining || 0)}</p>
          </div>
        </div>
      </div>

      {/* Tâches à valider - Zone clé pour le directeur */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
          Tâches en Attente de Validation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
            <p className="text-sm text-orange-700 font-semibold">Paiements à valider</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{paiementsAttente.length}</p>
            <p className="text-xs text-orange-600 mt-1">En attente de traitement</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
            <p className="text-sm text-red-700 font-semibold">Élèves en difficulté</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.failedStudents}</p>
            <p className="text-xs text-red-600 mt-1">Moyenne inférieure à 10</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-yellow-700 font-semibold">Absences excessives</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">3</p>
            <p className="text-xs text-yellow-600 mt-1">À alerter</p>
          </div>
        </div>
      </div>

      {/* Paiements à valider - Tableau détaillé */}
      {paiementsAttente.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg shadow-sm border border-orange-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Paiements à Valider ({paiementsAttente.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-900 font-semibold">Élève</th>
                  <th className="px-4 py-3 text-left text-gray-900 font-semibold">Classe</th>
                  <th className="px-4 py-3 text-right text-gray-900 font-semibold">Montant</th>
                  <th className="px-4 py-3 text-left text-gray-900 font-semibold">Mode</th>
                  <th className="px-4 py-3 text-center text-gray-900 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-200">
                {paiementsAttente.map(p => (
                  <tr key={p.id} className="hover:bg-orange-100/50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {p.eleve?.nom} {p.eleve?.prenom}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.eleve?.classe?.nom}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatFCFALong(p.montantPaye)}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{p.modePayement || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleValiderPaiement(p.id, 'VALIDE')}
                          disabled={validatingId === p.id}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded font-semibold transition-all flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Valider
                        </button>
                        <button
                          onClick={() => handleValiderPaiement(p.id, 'REJETE')}
                          disabled={validatingId === p.id}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded font-semibold transition-all flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopStudentsCard students={topStudents} />
        <FeeChartCard students={studentsData} />
      </div>
    </div>
  )
}
