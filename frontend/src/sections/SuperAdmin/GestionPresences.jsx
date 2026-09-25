import { useState, useEffect, useMemo } from 'react'
import { Loader, Calendar, Save, Search, CheckCheck, AlertTriangle } from 'lucide-react'
import { apiClient } from '../../api/client'
import BoutonsExport from '../../components/BoutonsExport'
import { nomFichierSur } from '../../utils/exportTableau'

const aujourdhui = () => new Date().toISOString().split('T')[0]
const decalerJours = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const debutDuMois = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1, 12).toISOString().split('T')[0] }
const jourFr = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const courtFr = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

const STATUTS = [
  { code: 'PRESENT', label: 'Présent', icone: '✓', actif: 'bg-green-600 text-white border-green-600', repos: 'text-green-700 border-green-300 hover:bg-green-50' },
  { code: 'ABSENT', label: 'Absent', icone: '✗', actif: 'bg-red-600 text-white border-red-600', repos: 'text-red-700 border-red-300 hover:bg-red-50' },
  { code: 'RETARD', label: 'Retard', icone: '⏰', actif: 'bg-amber-500 text-white border-amber-500', repos: 'text-amber-700 border-amber-300 hover:bg-amber-50' },
  { code: 'JUSTIFIE', label: 'Justifié', icone: '📄', actif: 'bg-blue-600 text-white border-blue-600', repos: 'text-blue-700 border-blue-300 hover:bg-blue-50' }
]
const LIBELLE = Object.fromEntries(STATUTS.map(s => [s.code, s.label]))

export default function GestionPresences() {
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [eleves, setEleves] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [vue, setVue] = useState('appel') // 'appel' ou 'resume'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Appel du jour
  const [dateJour, setDateJour] = useState(aujourdhui())
  const [statuts, setStatuts] = useState({})
  const [observations, setObservations] = useState({})
  const [enregistres, setEnregistres] = useState({}) // état en base (pour détecter les modifications)
  const [recherche, setRecherche] = useState('')
  const [seulementAbsents, setSeulementAbsents] = useState(false)
  const [chargementAppel, setChargementAppel] = useState(false)
  const [saving, setSaving] = useState(false)

  // Résumé
  const [dateDebut, setDateDebut] = useState(debutDuMois())
  const [dateFin, setDateFin] = useState(aujourdhui())
  const [historique, setHistorique] = useState([])
  const [detailOuvert, setDetailOuvert] = useState('')

  useEffect(() => {
    Promise.all([apiClient.getEcoles(), apiClient.getClasses(), apiClient.getEleves()])
      .then(([ecolesData, classesData, elevesData]) => {
        setEcoles(ecolesData)
        setClasses(classesData)
        setEleves(elevesData)
        if (ecolesData.length > 0) setEcoleId(ecolesData[0].id)
      })
      .catch(err => setError(err.message || 'Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [])

  const classesEcole = useMemo(() => classes.filter(c => (c.ecoleId || c.ecole?.id) === ecoleId).sort((a, b) => a.nom.localeCompare(b.nom)), [classes, ecoleId])
  useEffect(() => {
    if (classesEcole.length > 0 && !classesEcole.some(c => c.id === classeId)) setClasseId(classesEcole[0].id)
    if (classesEcole.length === 0) setClasseId('')
  }, [classesEcole])

  const elevesClasse = useMemo(() => eleves.filter(e => e.classeId === classeId).sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')), [eleves, classeId])
  const classe = classes.find(c => c.id === classeId)

  const modifie = elevesClasse.some(e => (statuts[e.id] || '') !== (enregistres[e.id] || '') || (observations[e.id] || '') !== (enregistres[`obs-${e.id}`] || ''))

  // Charge l'appel déjà enregistré pour cette classe et cette date
  useEffect(() => {
    if (!classeId || vue !== 'appel') return
    let annule = false
    setChargementAppel(true)
    setMessage('')
    apiClient.getPresences({ ecoleId, classeId, date: dateJour })
      .then(data => {
        if (annule) return
        const st = {}, obs = {}, base = {}
        data.forEach(p => { st[p.eleveId] = p.statut; obs[p.eleveId] = p.observation || ''; base[p.eleveId] = p.statut; base[`obs-${p.eleveId}`] = p.observation || '' })
        setStatuts(st); setObservations(obs); setEnregistres(base)
      })
      .catch(err => { if (!annule) setError(err.message || 'Erreur lors du chargement des présences') })
      .finally(() => { if (!annule) setChargementAppel(false) })
    return () => { annule = true }
  }, [classeId, dateJour, vue, ecoleId])

  // Charge l'historique de la période pour le résumé
  useEffect(() => {
    if (!classeId || vue !== 'resume') return
    let annule = false
    setChargementAppel(true)
    apiClient.getPresences({ ecoleId, classeId, dateDebut, dateFin })
      .then(data => { if (!annule) setHistorique(data) })
      .catch(err => { if (!annule) setError(err.message || "Erreur lors du chargement de l'historique") })
      .finally(() => { if (!annule) setChargementAppel(false) })
    return () => { annule = true }
  }, [classeId, dateDebut, dateFin, vue, ecoleId])

  const changerContexte = (appliquer) => {
    if (vue === 'appel' && modifie && !confirm("L'appel n'est pas enregistré. Changer de sélection le fera perdre. Continuer ?")) return
    appliquer()
  }

  const choisir = (eleveId, code) => {
    setMessage('')
    setStatuts(prev => ({ ...prev, [eleveId]: prev[eleveId] === code ? undefined : code }))
  }

  const toutPresent = () => {
    setMessage('')
    setStatuts(prev => ({ ...prev, ...Object.fromEntries(elevesClasse.filter(e => !prev[e.id]).map(e => [e.id, 'PRESENT'])) }))
  }

  const enregistrer = async () => {
    const nonPointes = elevesClasse.filter(e => !statuts[e.id])
    if (nonPointes.length > 0 && !confirm(`${nonPointes.length} élève(s) n'ont pas été pointés : ils seront enregistrés « présents ». Continuer ?`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const lignes = elevesClasse.map(e => ({ eleveId: e.id, statut: statuts[e.id] || 'PRESENT', observation: observations[e.id] || '' }))
      const res = await apiClient.enregistrerAppel(classeId, dateJour, lignes)
      const nouveau = { ...statuts }
      lignes.forEach(l => { nouveau[l.eleveId] = l.statut })
      const base = {}
      lignes.forEach(l => { base[l.eleveId] = l.statut; base[`obs-${l.eleveId}`] = l.observation })
      setStatuts(nouveau)
      setEnregistres(base)
      setMessage(`Appel enregistré : ${res.enregistres} élève(s)${res.erreurs.length ? ` — ${res.erreurs.length} erreur(s)` : ''}.`)
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement de l'appel")
    } finally {
      setSaving(false)
    }
  }

  const compteurs = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, RETARD: 0, JUSTIFIE: 0, nonPointe: 0 }
    elevesClasse.forEach(e => { if (statuts[e.id]) c[statuts[e.id]]++; else c.nonPointe++ })
    return c
  }, [elevesClasse, statuts])

  const elevesAffiches = elevesClasse.filter(e => {
    if (recherche && !`${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(recherche.toLowerCase())) return false
    if (seulementAbsents && !['ABSENT', 'RETARD', 'JUSTIFIE'].includes(statuts[e.id])) return false
    return true
  })

  // Résumé par élève sur la période
  const resume = useMemo(() => {
    const parEleve = new Map(elevesClasse.map(e => [e.id, { eleve: e, absences: [], ABSENT: 0, JUSTIFIE: 0, RETARD: 0, PRESENT: 0 }]))
    historique.forEach(p => {
      const ligne = parEleve.get(p.eleveId)
      if (!ligne) return
      ligne[p.statut] = (ligne[p.statut] || 0) + 1
      if (p.statut !== 'PRESENT') ligne.absences.push(p)
    })
    return [...parEleve.values()].sort((a, b) => (b.ABSENT + b.JUSTIFIE) - (a.ABSENT + a.JUSTIFIE) || b.RETARD - a.RETARD)
  }, [elevesClasse, historique])

  const exportResume = () => ({
    sections: [{
      titre: `RÉSUMÉ DES ABSENCES — ${classe?.nom || ''}`,
      nomFeuille: 'Absences',
      paysage: false,
      entete: [`${classe?.ecole?.nomCourt || ''} — du ${courtFr(dateDebut)} au ${courtFr(dateFin)}`],
      colonnes: [{ titre: 'N°', centre: true, largeur: 10 }, { titre: 'Élève' }, { titre: 'Absences', centre: true }, { titre: 'Justifiées', centre: true }, { titre: 'Retards', centre: true }, { titre: 'Dates des absences' }],
      lignes: resume.map((r, i) => [i + 1, `${r.eleve.nom} ${r.eleve.prenom}`, r.ABSENT, r.JUSTIFIE, r.RETARD, r.absences.map(a => `${courtFr(a.date)} ${LIBELLE[a.statut]?.toLowerCase()}`).join(', ')])
    }],
    nomFichier: `absences-${nomFichierSur(`${classe?.nom || ''}-${dateDebut}-${dateFin}`)}`
  })

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  const selecteur = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">📋 Appel et absences des élèves</h2>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      <div className="bg-white rounded-lg shadow-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ecoles.length > 1 ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">École</label>
            <select value={ecoleId} onChange={(e) => changerContexte(() => setEcoleId(e.target.value))} className={selecteur}>
              {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
            </select>
          </div>
        ) : <div />}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
          <select value={classeId} onChange={(e) => changerContexte(() => setClasseId(e.target.value))} className={selecteur}>
            {classesEcole.length === 0 && <option value="">Aucune classe</option>}
            {classesEcole.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={() => changerContexte(() => setVue('appel'))} className={`flex-1 px-3 py-2 rounded-lg font-medium ${vue === 'appel' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Faire l'appel</button>
          <button onClick={() => changerContexte(() => setVue('resume'))} className={`flex-1 px-3 py-2 rounded-lg font-medium ${vue === 'resume' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Résumé des absences</button>
        </div>
      </div>

      {chargementAppel && <div className="text-center text-slate-500 flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Chargement...</div>}

      {vue === 'appel' && classeId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input type="date" value={dateJour} max={aujourdhui()} onChange={(e) => changerContexte(() => setDateJour(e.target.value))} className="px-3 py-2 border border-slate-300 rounded-lg" />
              <button onClick={() => changerContexte(() => setDateJour(aujourdhui()))} className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">Aujourd'hui</button>
              <button onClick={() => changerContexte(() => setDateJour(decalerJours(dateJour, -1)))} className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">← Veille</button>
              <span className="text-sm text-slate-600 capitalize">{jourFr(dateJour)}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">✓ Présents : <strong>{compteurs.PRESENT}</strong></span>
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-800">✗ Absents : <strong>{compteurs.ABSENT}</strong></span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">⏰ Retards : <strong>{compteurs.RETARD}</strong></span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">📄 Justifiés : <strong>{compteurs.JUSTIFIE}</strong></span>
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">Non pointés : <strong>{compteurs.nonPointe}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un élève..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <button onClick={toutPresent} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium">
                <CheckCheck className="w-4 h-4" /> Tous présents
              </button>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={seulementAbsents} onChange={(e) => setSeulementAbsents(e.target.checked)} /> Seulement les absents / retards
              </label>
            </div>
          </div>

          {elevesClasse.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucun élève dans cette classe</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {elevesAffiches.map((eleve, index) => {
                const statut = statuts[eleve.id]
                return (
                  <div key={eleve.id} className={`p-3 ${statut === 'ABSENT' ? 'bg-red-50/60' : statut === 'RETARD' ? 'bg-amber-50/60' : statut === 'JUSTIFIE' ? 'bg-blue-50/60' : ''}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-8 text-xs text-slate-400 text-right">{index + 1}</span>
                      <div className="flex-1 min-w-[180px]">
                        <div className="font-medium text-slate-900">{eleve.nom} {eleve.prenom}</div>
                        <div className="text-xs text-slate-400">{eleve.matricule}</div>
                      </div>
                      <div className="flex gap-1.5">
                        {STATUTS.map(s => (
                          <button
                            key={s.code}
                            onClick={() => choisir(eleve.id, s.code)}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition min-w-[44px] ${statut === s.code ? s.actif : `bg-white ${s.repos}`}`}
                            title={s.label}
                          >
                            <span>{s.icone}</span><span className="hidden md:inline"> {s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {statut && statut !== 'PRESENT' && (
                      <div className="mt-2 pl-11">
                        <input
                          type="text"
                          value={observations[eleve.id] || ''}
                          onChange={(e) => setObservations({ ...observations, [eleve.id]: e.target.value })}
                          placeholder={statut === 'JUSTIFIE' ? 'Motif de la justification (ex : maladie, certificat)' : statut === 'RETARD' ? 'Précision (ex : arrivé à 8h30)' : "Motif ou remarque (facultatif)"}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <span className={`text-sm ${modifie ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
              {modifie ? <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Modifications non enregistrées</span> : 'Appel à jour'}
            </span>
            <button onClick={enregistrer} disabled={saving || elevesClasse.length === 0 || !modifie} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 font-medium">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer l'appel
            </button>
          </div>
        </div>
      )}

      {vue === 'resume' && classeId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Du</span>
              <input type="date" value={dateDebut} max={dateFin} onChange={(e) => setDateDebut(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" />
              <span>au</span>
              <input type="date" value={dateFin} min={dateDebut} max={aujourdhui()} onChange={(e) => setDateFin(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
            <BoutonsExport construire={exportResume} disabled={resume.length === 0} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Élève</th>
                  <th className="px-4 py-3 text-center font-semibold text-red-700">Absences</th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-700">Justifiées</th>
                  <th className="px-4 py-3 text-center font-semibold text-amber-700">Retards</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Détail</th>
                </tr>
              </thead>
              <tbody>
                {resume.map(r => (
                  <tr key={r.eleve.id} className={`border-b border-slate-100 ${r.ABSENT >= 3 ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2 text-slate-900">{r.eleve.nom} {r.eleve.prenom}</td>
                    <td className={`px-4 py-2 text-center font-mono ${r.ABSENT >= 3 ? 'text-red-700 font-bold' : ''}`}>{r.ABSENT || '—'}</td>
                    <td className="px-4 py-2 text-center font-mono">{r.JUSTIFIE || '—'}</td>
                    <td className="px-4 py-2 text-center font-mono">{r.RETARD || '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {r.absences.length === 0 ? <span className="text-slate-300">Aucune absence</span> : (
                        <>
                          <button onClick={() => setDetailOuvert(detailOuvert === r.eleve.id ? '' : r.eleve.id)} className="text-blue-600 underline">
                            {r.absences.length} date(s) {detailOuvert === r.eleve.id ? '▲' : '▼'}
                          </button>
                          {detailOuvert === r.eleve.id && (
                            <ul className="mt-1 space-y-0.5">
                              {r.absences.sort((a, b) => String(a.date).localeCompare(String(b.date))).map(a => (
                                <li key={a.id}>{courtFr(a.date)} — {LIBELLE[a.statut]}{a.observation ? ` (${a.observation})` : ''}</li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="p-3 text-xs text-slate-500">Un élève avec 3 absences ou plus sur la période est surligné en rouge.</p>
        </div>
      )}
    </div>
  )
}
