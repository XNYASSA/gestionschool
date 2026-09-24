import { useState, useEffect, useContext } from 'react'
import { Award, Loader, Pencil, Plus, Trash2, Save, X, RotateCcw } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthContext } from '../../context/AuthContext'

const nouvelleLigne = () => ({ valMin: '', valMax: '', apc: '', gpa: '0', mentionFr: '', mentionEn: '' })

const formaterNombre = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function BaremeNotation() {
  const { user } = useContext(AuthContext)
  const peutModifier = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE'].includes(user?.roleAPI)

  const [ecoles, setEcoles] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [bareme, setBareme] = useState(null)
  const [brouillon, setBrouillon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiClient.getEcoles()
      .then(data => {
        setEcoles(data)
        if (data.length > 0) setEcoleId(data[0].id)
        else setLoading(false)
      })
      .catch(err => { setError(err.message || 'Erreur lors du chargement des écoles'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (ecoleId) charger(ecoleId)
  }, [ecoleId])

  const charger = async (id) => {
    setLoading(true)
    setError('')
    setBrouillon(null)
    try {
      setBareme(await apiClient.getBaremeNotation(id))
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du barème')
    } finally {
      setLoading(false)
    }
  }

  const modifierChamp = (index, champ, valeur) => {
    setBrouillon(brouillon.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)))
  }

  const enregistrer = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      setBareme(await apiClient.saveBaremeNotation(ecoleId, brouillon))
      setBrouillon(null)
      setMessage('Barème de notation enregistré.')
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const reinitialiser = async () => {
    if (!confirm("Revenir au barème APC par défaut ? Le barème personnalisé de cette école sera supprimé.")) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      setBareme(await apiClient.reinitialiserBaremeNotation(ecoleId))
      setBrouillon(null)
      setMessage('Barème APC par défaut rétabli.')
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation')
    } finally {
      setSaving(false)
    }
  }

  const enEdition = brouillon !== null
  const lignes = enEdition ? brouillon : bareme?.lignes || []
  const inputClasse = 'w-full px-2 py-1 border border-slate-300 rounded'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-600" /> Barème de notation (APC)
        </h2>
        {ecoles.length > 1 && (
          <select value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} disabled={enEdition} className="px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100">
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {error}</div>}
      {message && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">✓ {message}</div>}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            La mention et le niveau de compétence d'une note sont attribués automatiquement d'après ce barème (valeur minimale incluse, valeur maximale exclue).
            {bareme?.parDefaut && <span className="ml-1 font-medium text-emerald-700">Barème APC par défaut, non personnalisé pour cette école.</span>}
          </p>
          {peutModifier && (
            <div className="flex flex-wrap gap-2">
              {!enEdition ? (
                <>
                  <button onClick={() => { setBrouillon(lignes.map(l => ({ ...l, valMin: String(l.valMin), valMax: String(l.valMax), gpa: String(l.gpa) }))); setMessage('') }} disabled={loading || !bareme} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50">
                    <Pencil className="w-4 h-4" /> Modifier
                  </button>
                  {!bareme?.parDefaut && (
                    <button onClick={reinitialiser} disabled={saving} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-2 disabled:opacity-50">
                      <RotateCcw className="w-4 h-4" /> Rétablir le barème par défaut
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setBrouillon([...brouillon, nouvelleLigne()])} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nouveau
                  </button>
                  <button onClick={enregistrer} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                  </button>
                  <button onClick={() => { setBrouillon(null); setError('') }} disabled={saving} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-2">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" /> Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold">Val. min</th>
                  <th className="px-4 py-3 text-center font-semibold">Val. max</th>
                  <th className="px-4 py-3 text-center font-semibold">APC / LGAs</th>
                  <th className="px-4 py-3 text-center font-semibold">GPAs</th>
                  <th className="px-4 py-3 text-left font-semibold">Mention en français</th>
                  <th className="px-4 py-3 text-left font-semibold">Mention en anglais</th>
                  {enEdition && <th className="px-2 py-3" />}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                    {enEdition ? (
                      <>
                        <td className="px-2 py-2"><input type="text" inputMode="decimal" value={l.valMin} onChange={(e) => modifierChamp(i, 'valMin', e.target.value)} className={`${inputClasse} text-center`} /></td>
                        <td className="px-2 py-2"><input type="text" inputMode="decimal" value={l.valMax} onChange={(e) => modifierChamp(i, 'valMax', e.target.value)} className={`${inputClasse} text-center`} /></td>
                        <td className="px-2 py-2"><input type="text" value={l.apc} onChange={(e) => modifierChamp(i, 'apc', e.target.value)} className={`${inputClasse} text-center`} /></td>
                        <td className="px-2 py-2"><input type="text" inputMode="decimal" value={l.gpa} onChange={(e) => modifierChamp(i, 'gpa', e.target.value)} className={`${inputClasse} text-center`} /></td>
                        <td className="px-2 py-2"><input type="text" value={l.mentionFr} onChange={(e) => modifierChamp(i, 'mentionFr', e.target.value)} className={inputClasse} /></td>
                        <td className="px-2 py-2"><input type="text" value={l.mentionEn} onChange={(e) => modifierChamp(i, 'mentionEn', e.target.value)} className={inputClasse} /></td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => setBrouillon(brouillon.filter((_, j) => j !== i))} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Supprimer cette ligne"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-center font-mono">{formaterNombre(l.valMin)}</td>
                        <td className="px-4 py-3 text-center font-mono">{formaterNombre(l.valMax)}</td>
                        <td className="px-4 py-3 text-center font-semibold">{l.apc}</td>
                        <td className="px-4 py-3 text-center font-mono">{formaterNombre(l.gpa)}</td>
                        <td className="px-4 py-3 text-slate-900">{l.mentionFr}</td>
                        <td className="px-4 py-3 text-slate-700">{l.mentionEn}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900 mb-1">Niveaux de compétence (APC)</p>
        <p><strong>NA</strong> : non acquis — <strong>ECA</strong> : en cours d'acquisition — <strong>A</strong> : acquis — <strong>A+</strong> : expertise.</p>
      </div>
    </div>
  )
}
