import { useState, useEffect, useMemo } from 'react'
import { Loader, Download, Upload, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { apiClient } from '../../api/client'
import { lireClasseurScolarite } from '../../utils/lireScolarite'
import { proposerClasse, canonClasse } from '../../utils/appariementClasses'
import { typeTechnique } from '../../utils/filieres'
import BoutonsExport from '../../components/BoutonsExport'

const COLONNES = [
  { titre: 'Matricule (optionnel)', cle: 'matricule' },
  { titre: 'Nom*', cle: 'nom' },
  { titre: 'Prénom*', cle: 'prenom' },
  { titre: 'Sexe (M/F)', cle: 'sexe' },
  { titre: 'Date de naissance (JJ/MM/AAAA)', cle: 'dateNaissance' },
  { titre: 'Classe*', cle: 'classe' },
  { titre: 'Nom du parent/tuteur*', cle: 'nomParent' },
  { titre: 'Lien de parenté', cle: 'lieuParente' },
  { titre: 'Téléphone du parent*', cle: 'telephoneParent' },
  { titre: 'Email du parent', cle: 'emailParent' },
  { titre: 'Adresse du parent', cle: 'adresseParent' },
  { titre: 'Inscription déjà payée (FCFA)', cle: 'inscription' },
  { titre: 'Tranche 1 déjà payée (FCFA)', cle: 'tranche1' },
  { titre: 'Tranche 2 déjà payée (FCFA)', cle: 'tranche2' },
  { titre: 'Tranche 3 déjà payée (FCFA)', cle: 'tranche3' }
]

const EXEMPLE = ['', 'Nkomo', 'Jean', 'M', '15/03/2015', '6ème A', 'Marie Nkomo', 'Mère', '677123456', '', '', '21000', '', '', '']

const TAILLE_LOT = 100
const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

function formatDate(valeur) {
  if (valeur instanceof Date) {
    const jj = String(valeur.getDate()).padStart(2, '0')
    const mm = String(valeur.getMonth() + 1).padStart(2, '0')
    return `${valeur.getFullYear()}-${mm}-${jj}`
  }
  const texte = String(valeur || '').trim()
  const match = texte.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, j, m, a] = match
    return `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`
  }
  return texte
}

// Lignes d'un classeur au format du modèle (une feuille ou plusieurs, en-têtes exacts en 1ère ligne)
function lireModele(classeur) {
  const lignes = []
  classeur.worksheets.forEach(feuille => {
    const entetes = feuille.getRow(1).values.slice(1).map(v => String(v || '').trim())
    const indexParCle = {}
    COLONNES.forEach(c => {
      const idx = entetes.findIndex(e => e === c.titre)
      if (idx !== -1) indexParCle[c.cle] = idx
    })
    if (indexParCle.nom === undefined) return

    feuille.eachRow((row, numeroLigne) => {
      if (numeroLigne === 1) return
      const valeurs = row.values.slice(1)
      if (valeurs.every(v => v === null || v === undefined || v === '')) return
      const ligne = {}
      COLONNES.forEach(c => {
        const idx = indexParCle[c.cle]
        let val = idx !== undefined ? valeurs[idx] : ''
        if (c.cle === 'dateNaissance') val = formatDate(val)
        ligne[c.cle] = val !== null && val !== undefined ? String(val).trim() : ''
      })
      lignes.push(ligne)
    })
  })
  return lignes
}

export default function ImporterEleves({ onNavigate }) {
  const [ecoles, setEcoles] = useState([])
  const [classes, setClasses] = useState([])
  const [ecoleId, setEcoleId] = useState('')
  const [fichier, setFichier] = useState(null)
  const [mode, setMode] = useState(null) // 'scolarite' (une feuille par classe) ou 'modele'
  const [lignes, setLignes] = useState([]) // mode modèle
  const [feuilles, setFeuilles] = useState([]) // mode scolarité
  const [cibles, setCibles] = useState({}) // clé de groupe -> classeId
  const [totauxBareme, setTotauxBareme] = useState({}) // 'ecoleId|niveau' -> montant total du barème
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [progression, setProgression] = useState('')
  const [erreurLecture, setErreurLecture] = useState('')
  const [resultat, setResultat] = useState(null)

  useEffect(() => {
    Promise.all([apiClient.getEcoles(), apiClient.getClasses()])
      .then(([ecolesData, classesData]) => {
        setEcoles(ecolesData)
        setClasses(classesData.map(c => ({ id: c.id, nom: c.nom, niveau: c.niveau, ecoleId: c.ecoleId || c.ecole?.id, ecoleNom: c.ecole?.nomCourt || '' })))
        if (ecolesData.length > 0) setEcoleId(ecolesData[0].id)
        // Barèmes de frais : servent à reconnaître la discipline technique d'après la pension et à contrôler les montants
        Promise.all(ecolesData.map(e => apiClient.getConfigurationsFraisByEcole(e.id).then(cfgs => [e.id, cfgs]).catch(() => [e.id, []])))
          .then(parEcole => {
            const totaux = {}
            parEcole.forEach(([id, cfgs]) => (cfgs || []).forEach(cfg => (cfg.niveaux || []).forEach(n => { totaux[`${id}|${n.niveau}`] = cfg.montantFraisTotal })))
            setTotauxBareme(totaux)
          })
      })
      .catch(err => setErreurLecture(err.message || 'Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [])

  // Groupes d'élèves à rapprocher d'une classe : une ligne par feuille et par classe écrite dans la colonne « Classe »
  const groupes = useMemo(() => {
    const liste = []
    feuilles.forEach((feuille, indexFeuille) => {
      if (feuille.eleves.length === 0) return

      // Enseignement technique : A1 à A4 = 1ère à 4ème année (francophone), Y1 à Y4 = Year 1 à 4 (anglophone).
      // La discipline (industriel / commercial) se déduit de la pension écrite dans le fichier.
      const tech = /^\s*([ay])\s*([1-4])\s*$/i.exec(feuille.nom)
      if (tech) {
        const langue = tech[1].toLowerCase() === 'a' ? 'fr' : 'en'
        const annee = tech[2]
        const candidates = classes.filter(c => typeTechnique(c)?.langue === langue && new RegExp(`(^|\\D)${annee}(\\D|$)`).test(c.niveau))
        const parCible = new Map()
        feuille.eleves.forEach(e => {
          const trouvees = candidates.filter(c => totauxBareme[`${c.ecoleId}|${c.niveau}`] === e.pensionTotal)
          const classe = trouvees.length === 1 ? trouvees[0] : null
          const cle = classe ? classe.id : `inconnu-${e.pensionTotal}`
          if (!parCible.has(cle)) parCible.set(cle, { classe, pension: e.pensionTotal, eleves: [] })
          parCible.get(cle).eleves.push(e)
        })
        parCible.forEach((g, cle) => liste.push({
          cle: `${indexFeuille}|tech|${cle}`,
          feuille: feuille.nom,
          classeTexte: `Pension ${formatFCFA(g.pension)}`,
          eleves: g.eleves,
          paye: g.eleves.reduce((sum, e) => sum + e.inscription + e.tranche1 + e.tranche2 + e.tranche3, 0),
          suggestion: g.classe,
          ecart: null,
          aVerifier: false,
          motif: g.classe ? '' : candidates.length === 0
            ? `Aucune classe technique de ${langue === 'fr' ? '1ère à 4ème année' : 'Year 1 à 4'} : créez-les d'abord.`
            : `La pension de ${formatFCFA(g.pension)} indiquée dans le fichier ne correspond à aucun barème technique (industriel ou commercial) : choisissez la classe et vérifiez le montant.`
        }))
        return
      }

      const parClasse = new Map()
      feuille.eleves.forEach(e => {
        const cle = canonClasse(e.classeTexte)
        if (!parClasse.has(cle)) parClasse.set(cle, { classeTexte: e.classeTexte, eleves: [] })
        parClasse.get(cle).eleves.push(e)
      })
      const plusGrand = Math.max(...[...parClasse.values()].map(g => g.eleves.length))
      parClasse.forEach((g, cle) => {
        const proposition = proposerClasse({ feuille: feuille.nom, classeTexte: g.classeTexte }, classes, ecoleId)
        // Groupe minoritaire d'une feuille dont le nom ne désigne pas une classe : à confirmer plutôt que deviné
        const aVerifier = !!proposition.classe && !proposition.parFeuille && parClasse.size > 1 && g.eleves.length < plusGrand
        liste.push({
          cle: `${indexFeuille}|${cle}`,
          feuille: feuille.nom,
          classeTexte: g.classeTexte,
          eleves: g.eleves,
          paye: g.eleves.reduce((s, e) => s + e.inscription + e.tranche1 + e.tranche2 + e.tranche3, 0),
          suggestion: proposition.classe,
          ecart: proposition.ecart,
          aVerifier,
          motif: ''
        })
      })
    })
    return liste
  }, [feuilles, classes, ecoleId, totauxBareme])

  // Classe retenue par défaut pour chaque groupe (modifiable) ; les groupes à vérifier restent à choisir
  useEffect(() => {
    setCibles(Object.fromEntries(groupes.map(g => [g.cle, g.suggestion && !g.aVerifier ? g.suggestion.id : ''])))
  }, [groupes])

  const telechargerModele = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const feuille = workbook.addWorksheet('Élèves')
    feuille.addRow(COLONNES.map(c => c.titre))
    feuille.addRow(EXEMPLE)
    feuille.getRow(1).font = { bold: true }
    feuille.columns.forEach(col => { col.width = 24 })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-eleves.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFichier = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFichier(file)
    setErreurLecture('')
    setResultat(null)
    setLignes([])
    setFeuilles([])
    setMode(null)

    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())

      const lues = lireClasseurScolarite(workbook)
      if (lues.some(f => f.eleves.length > 0)) {
        setMode('scolarite')
        setFeuilles(lues)
        return
      }

      const lignesModele = lireModele(workbook)
      if (lignesModele.length === 0) {
        setErreurLecture("Aucun élève trouvé dans ce fichier : ni feuilles de scolarité (Noms et Prénoms, Inscription, Tranche 1…), ni modèle d'import.")
        return
      }
      setMode('modele')
      setLignes(lignesModele)
    } catch (err) {
      setErreurLecture('Impossible de lire ce fichier : ' + err.message)
    }
  }

  const groupesImportes = groupes.filter(g => cibles[g.cle])
  const groupesIgnores = groupes.filter(g => !cibles[g.cle])
  const totalEleves = groupes.reduce((s, g) => s + g.eleves.length, 0)
  const elevesImportes = groupesImportes.reduce((s, g) => s + g.eleves.length, 0)
  const montantImporte = groupesImportes.reduce((s, g) => s + g.paye, 0)
  const feuillesIgnorees = feuilles.filter(f => f.eleves.length === 0)

  // Anomalies du fichier : chacune indique le problème et l'information à corriger ou à ajouter
  const anomalies = useMemo(() => {
    const liste = []
    const ajouter = (feuille, e, categorie, probleme, aFaire) => liste.push({ categorie, feuille: String(feuille).trim(), ligne: e?.ligneExcel || '', eleve: e?.nomComplet || '', probleme, aFaire })
    const classeParId = new Map(classes.map(c => [c.id, c]))
    const cle = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

    const parMatricule = new Map()
    const parNom = new Map()
    feuilles.forEach(f => f.eleves.forEach(e => {
      if (e.matricule) { if (!parMatricule.has(e.matricule)) parMatricule.set(e.matricule, []); parMatricule.get(e.matricule).push({ f, e }) }
      const k = cle(`${e.nom} ${e.prenom}`)
      if (!parNom.has(k)) parNom.set(k, [])
      parNom.get(k).push({ f, e })
    }))

    feuilles.forEach(f => {
      f.anomalies.forEach(a => ajouter(f.nom, null, 'Montants sans nom d\'élève', a, 'Ajouter le nom de l\'élève dans le fichier (ou supprimer la ligne) avant de réimporter'))
      f.eleves.forEach(e => {
        if (!e.prenom) ajouter(f.nom, e, 'Prénom manquant', 'Le nom ne comporte qu\'un seul mot : prénom introuvable', 'Ajouter le prénom (fichier ou fiche élève)')
        if (/[,;:.()/\d]/.test(e.nomComplet)) ajouter(f.nom, e, 'Nom à corriger', `Le nom contient un caractère inhabituel : « ${e.nomComplet} »`, 'Corriger l\'orthographe du nom')
        if (!e.matricule) ajouter(f.nom, e, 'Matricule absent', 'Aucun matricule (colonne « Mle » vide)', 'Un matricule automatique sera attribué ; ajouter le matricule si nécessaire')
        const total = e.inscription + e.tranche1 + e.tranche2 + e.tranche3
        if (e.pensionTotal > 0 && total > e.pensionTotal) ajouter(f.nom, e, 'Montant payé supérieur à la pension', `Payé ${formatFCFA(total)} pour une pension de ${formatFCFA(e.pensionTotal)}`, 'Vérifier les montants payés ou la pension')
      })
    })
    parMatricule.forEach((occ, matricule) => {
      if (occ.length > 1) occ.forEach(({ f, e }) => ajouter(f.nom, e, 'Matricule en double', `Le matricule « ${matricule} » est utilisé ${occ.length} fois (${occ.map(o => o.f.nom.trim()).join(', ')})`, 'Un suffixe « -2 » sera ajouté au second ; corriger le matricule si nécessaire'))
    })
    parNom.forEach(occ => {
      if (occ.length > 1) occ.forEach(({ f, e }) => ajouter(f.nom, e, 'Élève présent plusieurs fois', `« ${e.nomComplet} » apparaît ${occ.length} fois (${occ.map(o => `${o.f.nom.trim()} ligne ${o.e.ligneExcel}`).join(', ')})`, 'Supprimer le doublon du fichier'))
    })

    groupes.forEach(g => {
      const classe = classeParId.get(cibles[g.cle])
      if (!classe) {
        g.eleves.forEach(e => ajouter(g.feuille, e, 'Classe de destination non choisie', g.motif || `Classe « ${g.classeTexte || g.feuille.trim()} » non reconnue : l'élève ne sera pas importé`, 'Choisir la classe dans le tableau ci-dessus (ou la créer dans « Classes »)'))
        return
      }
      const totalBareme = totauxBareme[`${classe.ecoleId}|${classe.niveau}`]
      g.eleves.forEach(e => {
        const paye = e.inscription + e.tranche1 + e.tranche2 + e.tranche3
        if (totalBareme === undefined) {
          if (paye > 0) ajouter(g.feuille, e, 'Classe sans barème de frais', `La classe « ${classe.nom} » n'a pas de barème : ${formatFCFA(paye)} payés ne pourront pas être enregistrés`, 'Configurer le barème de cette classe (Configuration frais) puis réimporter')
        } else if (e.pensionTotal > 0 && e.pensionTotal !== totalBareme) {
          ajouter(g.feuille, e, 'Pension différente du barème', `Pension du fichier ${formatFCFA(e.pensionTotal)} ≠ barème ${formatFCFA(totalBareme)} de la classe « ${classe.nom} »`, 'Vérifier la classe, une réduction / bourse, ou corriger le montant dans le fichier')
        }
        if (g.ecart) ajouter(g.feuille, e, 'Classe différente de la feuille', `La colonne « Classe » indique « ${g.ecart.nom} » alors que la feuille correspond à « ${classe.nom} »`, 'Vérifier dans quelle classe se trouve réellement l\'élève')
      })
    })
    return liste
  }, [feuilles, groupes, cibles, classes, totauxBareme])

  const anomaliesParCategorie = useMemo(() => {
    const parCat = new Map()
    anomalies.forEach(a => { if (!parCat.has(a.categorie)) parCat.set(a.categorie, []); parCat.get(a.categorie).push(a) })
    return [...parCat.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [anomalies])

  const elevesTechniques = groupesImportes.reduce((s, g) => s + (typeTechnique(classes.find(c => c.id === cibles[g.cle])) ? g.eleves.length : 0), 0)

  const envoyerParLots = async (parEcole) => {
    const resultats = []
    let traites = 0
    const total = parEcole.reduce((s, p) => s + p.lignes.length, 0)
    for (const { ecole, lignes: lignesEcole } of parEcole) {
      for (let debut = 0; debut < lignesEcole.length; debut += TAILLE_LOT) {
        const lot = lignesEcole.slice(debut, debut + TAILLE_LOT)
        setProgression(`Import en cours… ${traites} / ${total}`)
        const res = await apiClient.importerEleves(ecole, lot.map(l => l.donnees))
        res.resultats.forEach(r => resultats.push({ ...r, contexte: lot[r.ligne - 1]?.contexte || `Ligne ${r.ligne}`, infosManquantes: r.infosManquantes }))
        traites += lot.length
      }
    }
    return resultats
  }

  const lancerImport = async () => {
    setImporting(true)
    setResultat(null)
    setErreurLecture('')
    try {
      let parEcole
      if (mode === 'scolarite') {
        const classeParId = new Map(classes.map(c => [c.id, c]))
        const paquets = new Map()
        groupesImportes.forEach(g => {
          const classe = classeParId.get(cibles[g.cle])
          if (!paquets.has(classe.ecoleId)) paquets.set(classe.ecoleId, [])
          g.eleves.forEach(e => paquets.get(classe.ecoleId).push({
            contexte: `Feuille « ${g.feuille.trim()} » ligne ${e.ligneExcel} — ${e.nomComplet}`,
            donnees: {
              matricule: e.matricule, nom: e.nom, prenom: e.prenom, classe: classe.nom,
              inscription: String(e.inscription || ''), tranche1: String(e.tranche1 || ''), tranche2: String(e.tranche2 || ''), tranche3: String(e.tranche3 || '')
            }
          }))
        })
        parEcole = [...paquets.entries()].map(([ecole, lignesEcole]) => ({ ecole, lignes: lignesEcole }))
      } else {
        parEcole = [{ ecole: ecoleId, lignes: lignes.map((l, i) => ({ contexte: `Ligne ${i + 1}`, donnees: l })) }]
      }

      const resultats = await envoyerParLots(parEcole)
      setResultat({
        resultats,
        reussis: resultats.filter(r => r.succes).length,
        echoues: resultats.filter(r => !r.succes).length,
        incomplets: resultats.filter(r => r.succes && r.infosManquantes).length,
        sansBareme: resultats.filter(r => r.succes && r.sansBareme).length
      })
    } catch (err) {
      setErreurLecture(err.message || "Erreur lors de l'import")
    } finally {
      setImporting(false)
      setProgression('')
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md">
        <Loader className="w-5 h-5 animate-spin" /> Chargement...
      </div>
    )
  }

  const classesParEcole = ecoles.map(e => ({ ecole: e, classes: classes.filter(c => c.ecoleId === e.id).sort((a, b) => a.nom.localeCompare(b.nom)) })).filter(x => x.classes.length > 0)
  const importPossible = mode === 'scolarite' ? elevesImportes > 0 : lignes.length > 0

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">📥 Importer des élèves</h2>
      <p className="text-sm text-slate-500 -mt-4">
        Importez soit le fichier de scolarité tenu par la secrétaire (une feuille par classe : élèves et montants déjà payés), soit le modèle Excel de l'application.
        Le nom du parent et son téléphone ne sont pas obligatoires à l'import : les élèves concernés sont signalés en rouge pour être complétés ensuite.
      </p>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
          <select
            value={ecoleId}
            onChange={(e) => setEcoleId(e.target.value)}
            disabled={importing}
            className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg"
          >
            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nomCourt}</option>)}
          </select>
          {mode === 'scolarite' && <p className="text-xs text-slate-500 mt-1">École proposée en priorité pour reconnaître les classes ; chaque feuille peut être envoyée vers la classe de n'importe quelle école ci-dessous.</p>}
        </div>

        <button
          onClick={telechargerModele}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Télécharger le modèle Excel
        </button>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fichier rempli (.xlsx)</label>
          <input type="file" accept=".xlsx" onChange={handleFichier} disabled={importing} className="block" />
        </div>

        {erreurLecture && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">⚠️ {erreurLecture}</div>}

        {mode === 'scolarite' && !resultat && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>
                « {fichier?.name} » : <strong>{feuilles.filter(f => f.eleves.length > 0).length} feuille(s)</strong>,
                {' '}<strong>{totalEleves} élève(s)</strong>, montants déjà payés dans le fichier : <strong>{formatFCFA(groupes.reduce((s, g) => s + g.paye, 0))}</strong>.
              </span>
            </div>

            <p className="text-sm text-slate-600">
              Vérifiez la classe de destination de chaque feuille (proposée automatiquement d'après le nom de la feuille et la colonne « Classe »).
              Un groupe laissé sur « Ne pas importer » n'est pas importé.
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Feuille</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Classe écrite dans le fichier</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">Élèves</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Déjà payé</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 min-w-[260px]">Classe de destination</th>
                  </tr>
                </thead>
                <tbody>
                  {groupes.map(g => {
                    const choisie = !!cibles[g.cle]
                    return (
                      <tr key={g.cle} className={`border-b border-slate-100 ${!choisie ? 'bg-red-50' : g.ecart ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-2 text-slate-900 whitespace-nowrap">{g.feuille.trim()}</td>
                        <td className="px-3 py-2 text-slate-600">{g.classeTexte || '—'}</td>
                        <td className="px-3 py-2 text-center">{g.eleves.length}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatFCFA(g.paye)}</td>
                        <td className="px-3 py-2">
                          <select
                            value={cibles[g.cle] || ''}
                            onChange={(e) => setCibles({ ...cibles, [g.cle]: e.target.value })}
                            className={`w-full px-2 py-1 border rounded ${choisie ? 'border-slate-300' : 'border-red-400'}`}
                          >
                            <option value="">— Ne pas importer —</option>
                            {classesParEcole.map(({ ecole, classes: liste }) => (
                              <optgroup key={ecole.id} label={ecole.nomCourt}>
                                {liste.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          {!choisie && g.aVerifier && g.suggestion && <p className="text-xs text-red-600 mt-1">⚠ Groupe minoritaire de la feuille : la colonne Classe indique « {g.suggestion.nom} » ({g.suggestion.ecoleNom}). À confirmer.</p>}
                          {!choisie && !g.aVerifier && <p className="text-xs text-red-600 mt-1">⚠ {g.motif || "Classe non reconnue : choisissez-la (ou créez-la d'abord dans « Classes »)."}</p>}
                          {choisie && g.ecart && <p className="text-xs text-amber-700 mt-1">Attention : la colonne Classe de certaines lignes indique « {g.ecart.nom} » ; la classe de la feuille est retenue.</p>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm space-y-1">
              <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Informations à ajouter après l'import</p>
              <p>Le fichier ne contient ni le <strong>nom du parent</strong> ni son <strong>téléphone</strong> : les {elevesImportes} élève(s) importé(s) seront signalés en rouge dans la liste des élèves jusqu'à ce que ces informations soient ajoutées.</p>
              {elevesTechniques > 0 && <p>La <strong>filière</strong> (mécanique auto, comptabilité…) n'est pas dans le fichier : elle est à renseigner pour les {elevesTechniques} élève(s) de l'enseignement technique.</p>}
            </div>

            {anomalies.length > 0 && (
              <div className="border-2 border-red-300 rounded-lg bg-red-50 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> {anomalies.length} anomalie(s) dans le fichier — à corriger ou à compléter (l'import n'est pas bloqué)
                  </p>
                  <BoutonsExport
                    construire={() => ({
                      sections: [{
                        titre: 'ANOMALIES DU FICHIER DE SCOLARITÉ',
                        nomFeuille: 'Anomalies',
                        paysage: true,
                        entete: [`Fichier : ${fichier?.name || ''}`, `${anomalies.length} anomalie(s)`],
                        colonnes: [{ titre: 'Anomalie' }, { titre: 'Feuille' }, { titre: 'Ligne', centre: true, largeur: 14 }, { titre: 'Élève' }, { titre: 'Problème' }, { titre: 'À corriger / ajouter' }],
                        lignes: anomalies.map(a => [a.categorie, a.feuille, a.ligne, a.eleve, a.probleme, a.aFaire])
                      }],
                      nomFichier: 'anomalies-fichier-scolarite'
                    })}
                  />
                </div>
                {anomaliesParCategorie.map(([categorie, items]) => (
                  <details key={categorie} className="bg-white border border-red-200 rounded">
                    <summary className="cursor-pointer px-3 py-2 text-red-700 font-medium">{categorie} — {items.length}</summary>
                    <ul className="divide-y divide-red-100 max-h-72 overflow-y-auto">
                      {items.map((a, i) => (
                        <li key={i} className="px-3 py-1.5 text-sm text-red-700">
                          <strong>{a.feuille}{a.ligne ? ` · ligne ${a.ligne}` : ''}{a.eleve ? ` · ${a.eleve}` : ''}</strong> — {a.probleme}.
                          <span className="block text-xs text-red-500">➜ {a.aFaire}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}

            {feuillesIgnorees.length > 0 && (
              <p className="text-xs text-slate-500">
                Feuilles sans élève ignorées : {feuillesIgnorees.map(f => `« ${f.nom.trim()} »`).join(', ')}.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={lancerImport}
                disabled={importing || !importPossible}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? <><Loader className="w-4 h-4 animate-spin" /> {progression || 'Import en cours...'}</> : <><Upload className="w-4 h-4" /> Importer {elevesImportes} élève(s) — {formatFCFA(montantImporte)}</>}
              </button>
              {groupesIgnores.length > 0 && (
                <span className="text-sm text-red-700">{groupesIgnores.reduce((s, g) => s + g.eleves.length, 0)} élève(s) sans classe de destination ne seront pas importés.</span>
              )}
            </div>
          </div>
        )}

        {mode === 'modele' && !resultat && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{lignes.length} élève(s) détecté(s) dans le fichier « {fichier?.name} ».</p>
            <button
              onClick={lancerImport}
              disabled={importing || !ecoleId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? <><Loader className="w-4 h-4 animate-spin" /> {progression || 'Import en cours...'}</> : <><Upload className="w-4 h-4" /> Importer {lignes.length} élève(s)</>}
            </button>
          </div>
        )}

        {resultat && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-green-700 font-medium">{resultat.reussis} élève(s) importé(s) ou mis à jour</span>
              {resultat.echoues > 0 && <span className="text-red-700 font-medium">{resultat.echoues} en erreur</span>}
              {resultat.incomplets > 0 && <span className="text-red-700 font-medium">{resultat.incomplets} avec informations à compléter</span>}
              {resultat.sansBareme > 0 && <span className="text-amber-700 font-medium">{resultat.sansBareme} sans barème de frais (montants non enregistrés)</span>}
            </div>

            {resultat.incomplets > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-red-800 text-sm flex flex-wrap items-center justify-between gap-2">
                <span>Le nom du parent et/ou le téléphone manquent pour {resultat.incomplets} élève(s) : ils apparaissent en rouge dans la liste des élèves, à compléter avec le crayon ✏️.</span>
                {onNavigate && <button onClick={() => onNavigate('list-eleves')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Voir la liste des élèves</button>}
              </div>
            )}
            {onNavigate && resultat.reussis > 0 && (
              <button onClick={() => onNavigate('paiements')} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm">Voir le suivi des paiements</button>
            )}

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {[...resultat.resultats].sort((a, b) => Number(a.succes) - Number(b.succes)).map((r, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 text-sm ${!r.succes || r.infosManquantes || /attention|aucun barème/.test(r.message) ? 'text-red-700 bg-red-50' : ''}`}>
                  {r.succes
                    ? (r.infosManquantes ? <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />)
                    : <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                  <span><strong>{r.contexte} :</strong> {r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
