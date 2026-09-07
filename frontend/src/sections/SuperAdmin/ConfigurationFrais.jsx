import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Save, Loader, School, Calendar, ArrowLeft, Tag } from 'lucide-react'
import { apiClient } from '../../api/client'

const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`
const toDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : ''

export default function ConfigurationFrais() {
  const [ecoles, setEcoles] = useState([])
  const [selectedEcoleId, setSelectedEcoleId] = useState('')
  const [classes, setClasses] = useState([])
  const [configs, setConfigs] = useState([])
  const [selectedConfigId, setSelectedConfigId] = useState(null) // null = liste, 'new' = création, sinon id du barème édité
  const [loading, setLoading] = useState(true)
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Édition du barème sélectionné
  const [libelle, setLibelle] = useState('')
  const [niveauxSelectionnes, setNiveauxSelectionnes] = useState([])
  const [montantInscription, setMontantInscription] = useState('')
  const [dateLimiteInscription, setDateLimiteInscription] = useState('')
  const [tranches, setTranches] = useState([]) // { numero, montant, dateLimite }
  const [fraisAnnexes, setFraisAnnexes] = useState([]) // { id?, nom, montant, dateLimite }
  const [newTrancheMontant, setNewTrancheMontant] = useState('')
  const [newTrancheDate, setNewTrancheDate] = useState('')
  const [newAnnexeNom, setNewAnnexeNom] = useState('')
  const [newAnnexeMontant, setNewAnnexeMontant] = useState('')

  useEffect(() => {
    loadDonneesInitiales()
  }, [])

  useEffect(() => {
    if (selectedEcoleId) loadConfigs(selectedEcoleId)
  }, [selectedEcoleId])

  const loadDonneesInitiales = async () => {
    setLoading(true)
    try {
      const [ecolesData, classesData] = await Promise.all([apiClient.getEcoles(), apiClient.getClasses()])
      setEcoles(ecolesData)
      setClasses(classesData)
      if (ecolesData.length > 0) setSelectedEcoleId(ecolesData[0].id)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des écoles')
    } finally {
      setLoading(false)
    }
  }

  const loadConfigs = async (ecoleId) => {
    setLoadingConfigs(true)
    setError('')
    setMessage('')
    setSelectedConfigId(null)
    try {
      const data = await apiClient.getConfigurationsFraisByEcole(ecoleId)
      setConfigs(data)
    } catch (err) {
      setConfigs([])
      setError(err.message || 'Erreur lors du chargement des barèmes')
    } finally {
      setLoadingConfigs(false)
    }
  }

  const niveauxEcole = useMemo(() => {
    const set = new Set(classes.filter(c => c.ecoleId === selectedEcoleId).map(c => c.niveau))
    return Array.from(set).sort()
  }, [classes, selectedEcoleId])

  // Niveau -> barème (autre que celui en cours d'édition) qui le possède déjà
  const niveauProprietaire = useMemo(() => {
    const map = {}
    configs.forEach(c => {
      if (c.id === selectedConfigId) return
      c.niveaux.forEach(n => { map[n.niveau] = c.libelle || 'sans nom' })
    })
    return map
  }, [configs, selectedConfigId])

  const ouvrirNouveauBareme = () => {
    setSelectedConfigId('new')
    setLibelle('')
    setNiveauxSelectionnes([])
    setMontantInscription('')
    setDateLimiteInscription('')
    setTranches([])
    setFraisAnnexes([])
    setMessage('')
    setError('')
  }

  const ouvrirBareme = (config) => {
    setSelectedConfigId(config.id)
    setLibelle(config.libelle || '')
    setNiveauxSelectionnes(config.niveaux.map(n => n.niveau))
    setMontantInscription(config.montantInscription)
    setDateLimiteInscription(toDateInput(config.dateLimiteInscription))
    setTranches(config.tranches.map(t => ({ numero: t.numero, montant: t.montant, dateLimite: toDateInput(t.dateLimite) })))
    setFraisAnnexes(config.fraisAnnexes.map(f => ({ id: f.id, nom: f.nom, montant: f.montant, dateLimite: toDateInput(f.dateLimite) })))
    setMessage('')
    setError('')
  }

  const toggleNiveau = (niveau) => {
    if (niveauProprietaire[niveau]) return
    setNiveauxSelectionnes(prev => prev.includes(niveau) ? prev.filter(n => n !== niveau) : [...prev, niveau])
  }

  const handleCreerBareme = async () => {
    if (!libelle.trim() || niveauxSelectionnes.length === 0) {
      alert('Le libellé et au moins un niveau sont obligatoires')
      return
    }
    try {
      await apiClient.createConfigurationFrais({
        ecoleId: selectedEcoleId,
        libelle: libelle.trim(),
        niveaux: niveauxSelectionnes,
        montantInscription: parseInt(montantInscription) || 0,
        dateLimiteInscription: dateLimiteInscription || null,
        tranches: tranches.map(t => ({ montant: parseInt(t.montant) || 0, dateLimite: t.dateLimite || null })),
        fraisAnnexes: fraisAnnexes.map(f => ({ nom: f.nom, montant: parseInt(f.montant) || 0, dateLimite: f.dateLimite || null }))
      })
      setMessage('Barème créé avec succès')
      await loadConfigs(selectedEcoleId)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleSaveInfosGenerales = async () => {
    try {
      const result = await apiClient.updateConfigurationFrais(selectedConfigId, {
        libelle: libelle.trim(),
        niveaux: niveauxSelectionnes,
        montantInscription: parseInt(montantInscription),
        dateLimiteInscription: dateLimiteInscription || null
      })
      setMessage(`Barème mis à jour — appliqué à ${result.elevesAffectes} élève(s)`)
      await loadConfigs(selectedEcoleId)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleSaveTranche = async (tranche) => {
    try {
      const result = await apiClient.updateTranche(selectedConfigId, tranche.numero, parseInt(tranche.montant), tranche.dateLimite || null)
      setMessage(`Tranche ${tranche.numero} mise à jour — appliqué à ${result.elevesAffectes} élève(s)`)
      await loadConfigs(selectedEcoleId)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDeleteTranche = async (numero) => {
    if (!confirm(`Supprimer la tranche ${numero} ?`)) return
    try {
      await apiClient.deleteTranche(selectedConfigId, numero)
      const data = await apiClient.getConfigurationsFraisByEcole(selectedEcoleId)
      setConfigs(data)
      const courant = data.find(c => c.id === selectedConfigId)
      if (courant) ouvrirBareme(courant)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleAddTranche = async () => {
    if (!newTrancheMontant) {
      alert('Veuillez indiquer un montant pour la nouvelle tranche')
      return
    }
    try {
      const result = await apiClient.addTranche(selectedConfigId, parseInt(newTrancheMontant), newTrancheDate || null)
      setMessage(`Nouvelle tranche créée — ajoutée aux fiches de ${result.elevesAffectes} élève(s)`)
      setNewTrancheMontant('')
      setNewTrancheDate('')
      const data = await apiClient.getConfigurationsFraisByEcole(selectedEcoleId)
      setConfigs(data)
      const courant = data.find(c => c.id === selectedConfigId)
      if (courant) ouvrirBareme(courant)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleSaveAnnexe = async (annexe) => {
    try {
      const result = await apiClient.updateFraisAnnexe(annexe.id, parseInt(annexe.montant), annexe.dateLimite || null)
      setMessage(`"${annexe.nom}" mis à jour — appliqué à ${result.elevesAffectes} élève(s)`)
      await loadConfigs(selectedEcoleId)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleDeleteAnnexe = async (id) => {
    if (!confirm('Supprimer ce frais annexe ?')) return
    try {
      await apiClient.deleteFraisAnnexe(id)
      const data = await apiClient.getConfigurationsFraisByEcole(selectedEcoleId)
      setConfigs(data)
      const courant = data.find(c => c.id === selectedConfigId)
      if (courant) ouvrirBareme(courant)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleAddAnnexe = async () => {
    if (!newAnnexeNom.trim() || !newAnnexeMontant) {
      alert('Le nom et le montant du frais annexe sont obligatoires')
      return
    }
    try {
      const result = await apiClient.addFraisAnnexe(selectedConfigId, newAnnexeNom.trim(), parseInt(newAnnexeMontant))
      setMessage(`"${newAnnexeNom}" ajouté — appliqué à ${result.elevesAffectes} élève(s)`)
      setNewAnnexeNom('')
      setNewAnnexeMontant('')
      const data = await apiClient.getConfigurationsFraisByEcole(selectedEcoleId)
      setConfigs(data)
      const courant = data.find(c => c.id === selectedConfigId)
      if (courant) ouvrirBareme(courant)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const updateTrancheLocal = (numero, field, value) => {
    setTranches(tranches.map(t => t.numero === numero ? { ...t, [field]: value } : t))
  }

  const updateAnnexeLocal = (id, field, value) => {
    setFraisAnnexes(fraisAnnexes.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  const ajouterLigneTrancheLocale = () => {
    setTranches([...tranches, { numero: tranches.length + 1, montant: '', dateLimite: '' }])
  }

  const ajouterLigneAnnexeLocale = () => {
    setFraisAnnexes([...fraisAnnexes, { id: null, nom: '', montant: '', dateLimite: '' }])
  }

  const totalTranches = tranches.reduce((sum, t) => sum + (parseInt(t.montant) || 0), 0)
  const totalAnnexes = fraisAnnexes.reduce((sum, f) => sum + (parseInt(f.montant) || 0), 0)
  const totalGeneral = (parseInt(montantInscription) || 0) + totalTranches + totalAnnexes

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">⚙️ Configuration des frais</h2>
      <p className="text-sm text-slate-500 -mt-4">
        Une école peut avoir plusieurs barèmes (ex: un par niveau ou groupe de niveaux). Chaque élève reçoit automatiquement le barème correspondant au niveau de sa classe.
      </p>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-2">
        ⚡ Toute modification de montant est appliquée immédiatement aux fiches de frais des élèves concernés : montants dus, statuts (Soldé/Partiel/Non soldé) et sommes perçues/restantes sont recalculés automatiquement partout dans l'application.
      </p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      {/* Sélecteur d'école */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          <School className="w-4 h-4 text-blue-600" /> École
        </label>
        <select
          value={selectedEcoleId}
          onChange={(e) => setSelectedEcoleId(e.target.value)}
          className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg"
        >
          {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
        </select>
      </div>

      {loadingConfigs ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
          <Loader className="w-5 h-5 animate-spin" /> Chargement des barèmes...
        </div>
      ) : selectedConfigId === null ? (
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">Aucun barème pour cette école.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {configs.map(c => (
                <button
                  key={c.id}
                  onClick={() => ouvrirBareme(c)}
                  className="text-left bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition border border-slate-200"
                >
                  <h3 className="font-bold text-slate-900 mb-2">{c.libelle || 'Barème sans nom'}</h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.niveaux.map(n => (
                      <span key={n.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                        <Tag className="w-3 h-3" /> {n.niveau}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">Total : <span className="font-semibold text-slate-900">{formatFCFA(c.montantFraisTotal)}</span></p>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={ouvrirNouveauBareme}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nouveau barème
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <button onClick={() => loadConfigs(selectedEcoleId)} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste des barèmes
          </button>

          {/* Informations générales */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900">📝 Informations générales</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Libellé du barème</label>
              <input
                type="text"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                placeholder="Ex: 6ème à 4ème"
                className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Niveaux couverts par ce barème</label>
              <div className="flex flex-wrap gap-2">
                {niveauxEcole.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune classe créée pour cette école.</p>
                ) : niveauxEcole.map(niveau => {
                  const pris = niveauProprietaire[niveau]
                  const selectionne = niveauxSelectionnes.includes(niveau)
                  return (
                    <button
                      key={niveau}
                      type="button"
                      disabled={!!pris}
                      title={pris ? `Déjà utilisé par le barème "${pris}"` : ''}
                      onClick={() => toggleNiveau(niveau)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        pris
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : selectionne
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {niveau}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frais d'inscription (FCFA)</label>
                <input
                  type="number"
                  value={montantInscription}
                  onChange={(e) => setMontantInscription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" /> Date limite de règlement
                </label>
                <input
                  type="date"
                  value={dateLimiteInscription}
                  onChange={(e) => setDateLimiteInscription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              {selectedConfigId === 'new' ? (
                <button onClick={handleCreerBareme} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Créer le barème
                </button>
              ) : (
                <button onClick={handleSaveInfosGenerales} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              )}
            </div>
          </div>

          {/* Frais annexes */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">📎 Frais annexes ({fraisAnnexes.length})</h3>
            </div>
            {fraisAnnexes.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Aucun frais annexe (Livret médical, Trousse, Matière d'œuvre...)</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Montant (FCFA)</th>
                      {selectedConfigId !== 'new' && <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fraisAnnexes.map((f, i) => (
                      <tr key={f.id || i} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3">
                          {selectedConfigId === 'new' ? (
                            <input
                              type="text"
                              value={f.nom}
                              onChange={(e) => setFraisAnnexes(fraisAnnexes.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
                              placeholder="Ex: Livret Médical"
                              className="w-48 px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            <span className="font-medium text-slate-900">{f.nom}</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={f.montant}
                            onChange={(e) => selectedConfigId === 'new'
                              ? setFraisAnnexes(fraisAnnexes.map((x, j) => j === i ? { ...x, montant: e.target.value } : x))
                              : updateAnnexeLocal(f.id, 'montant', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        {selectedConfigId !== 'new' && (
                          <td className="px-6 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleSaveAnnexe(f)} className="p-2 hover:bg-blue-100 rounded text-blue-600 transition" title="Enregistrer">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteAnnexe(f.id)} className="p-2 hover:bg-red-100 rounded text-red-600 transition" title="Supprimer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedConfigId === 'new' ? (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button onClick={ajouterLigneAnnexeLocale} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nouveau frais — nom</label>
                  <input type="text" value={newAnnexeNom} onChange={(e) => setNewAnnexeNom(e.target.value)} placeholder="Ex: Trousse" className="w-48 px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Montant (FCFA)</label>
                  <input type="number" value={newAnnexeMontant} onChange={(e) => setNewAnnexeMontant(e.target.value)} className="w-32 px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <button onClick={handleAddAnnexe} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            )}
          </div>

          {/* Tranches de pension */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">💰 Tranches de pension ({tranches.length})</h3>
            </div>

            {tranches.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Aucune tranche configurée</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Tranche</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Montant (FCFA)</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Date limite de règlement</th>
                      {selectedConfigId !== 'new' && <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tranches.map((t, i) => (
                      <tr key={t.numero} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-900 font-medium">Tranche {t.numero}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={t.montant}
                            onChange={(e) => selectedConfigId === 'new'
                              ? setTranches(tranches.map((x, j) => j === i ? { ...x, montant: e.target.value } : x))
                              : updateTrancheLocal(t.numero, 'montant', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="date"
                            value={t.dateLimite}
                            onChange={(e) => selectedConfigId === 'new'
                              ? setTranches(tranches.map((x, j) => j === i ? { ...x, dateLimite: e.target.value } : x))
                              : updateTrancheLocal(t.numero, 'dateLimite', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        {selectedConfigId !== 'new' && (
                          <td className="px-6 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleSaveTranche(t)} className="p-2 hover:bg-blue-100 rounded text-blue-600 transition" title="Enregistrer">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteTranche(t.numero)} className="p-2 hover:bg-red-100 rounded text-red-600 transition" title="Supprimer la tranche">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedConfigId === 'new' ? (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button onClick={ajouterLigneTrancheLocale} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Ajouter une tranche
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nouvelle tranche — montant (FCFA)</label>
                  <input type="number" value={newTrancheMontant} onChange={(e) => setNewTrancheMontant(e.target.value)} className="w-40 px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date limite</label>
                  <input type="date" value={newTrancheDate} onChange={(e) => setNewTrancheDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <button onClick={handleAddTranche} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Ajouter une tranche
                </button>
              </div>
            )}

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <p className="font-bold text-slate-900">
                Montant total (inscription + frais annexes + tranches) : <span className="text-blue-600">{formatFCFA(totalGeneral)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
