import { estManquant, informationsManquantes } from './infosEleve'

// Signalements d'un élève : informations manquantes et incohérences des données, chacun avec le
// problème et ce qu'il faut faire pour le résoudre. `niveau` : 'rouge' (à corriger) ou 'orange' (à vérifier).
// Un signalement : { code, niveau, message, aFaire, manque? } — `manque` = information obligatoire absente.

const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`
const mots = (e) => `${e.nom} ${e.prenom}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean)

const LIBELLES_POSTES = { inscription: 'Inscription', tranche1: 'Tranche 1', tranche2: 'Tranche 2', tranche3: 'Tranche 3' }
const libellePoste = (tranche) => LIBELLES_POSTES[tranche] || String(tranche).replace(/^annexe_/, '')

// Calcule les signalements de tous les élèves fournis : Map(eleveId -> [signalement])
export function calculerSignalements(eleves) {
  const resultat = new Map()
  const ajouter = (id, signalement) => {
    if (!resultat.has(id)) resultat.set(id, [])
    resultat.get(id).push(signalement)
  }

  // Doublons possibles : même classe et au moins 2 mots de nom en commun (graphies proches)
  const parClasse = new Map()
  eleves.forEach(e => {
    if (!parClasse.has(e.classeId)) parClasse.set(e.classeId, [])
    parClasse.get(e.classeId).push({ e, m: mots(e) })
  })
  const doublons = new Map()
  parClasse.forEach(liste => {
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const communs = liste[i].m.filter(x => liste[j].m.includes(x)).length
        if (communs >= 2 && communs / Math.min(liste[i].m.length, liste[j].m.length) >= 0.66) {
          ;[[liste[i].e, liste[j].e], [liste[j].e, liste[i].e]].forEach(([a, b]) => {
            if (!doublons.has(a.id)) doublons.set(a.id, [])
            doublons.get(a.id).push(b)
          })
        }
      }
    }
  })

  eleves.forEach(e => {
    informationsManquantes(e).forEach(i => ajouter(e.id, {
      code: `manque-${i.champ}`, niveau: 'rouge', manque: true,
      message: `${i.libelle} à renseigner`,
      aFaire: `Renseigner ${i.libelle.toLowerCase()} dans la fiche de l'élève (crayon ✏️)`
    }))

    const postes = e.inscriptionsFrais || []
    postes.filter(p => p.montantPaye > p.montantDu).forEach(p => ajouter(e.id, {
      code: 'trop-percu', niveau: 'rouge',
      message: `Trop-perçu de ${formatFCFA(p.montantPaye - p.montantDu)} sur « ${libellePoste(p.tranche)} » (payé ${formatFCFA(p.montantPaye)} pour ${formatFCFA(p.montantDu)} dû)`,
      aFaire: 'Vérifier le montant enregistré ou le barème de la classe'
    }))
    if (postes.length === 0) ajouter(e.id, {
      code: 'sans-frais', niveau: 'rouge',
      message: `Aucun frais enregistré pour cet élève (pas de barème pour la classe « ${e.classe?.nom || '?'} »)`,
      aFaire: 'Configurer le barème de la classe (Configuration frais), puis réimporter ou réenregistrer les paiements'
    })

    if (/[,;:.()/\d]/.test(`${e.nom}${e.prenom}`)) ajouter(e.id, {
      code: 'nom-suspect', niveau: 'orange',
      message: `Nom à vérifier : caractère inhabituel dans « ${e.nom} ${e.prenom} »`,
      aFaire: "Corriger l'orthographe du nom dans la fiche"
    })
    if (/-\d+$/.test(e.matricule || '')) ajouter(e.id, {
      code: 'matricule-suffixe', niveau: 'orange',
      message: `Matricule « ${e.matricule} » : un suffixe a été ajouté car le numéro du fichier était déjà utilisé par un autre élève`,
      aFaire: 'Vérifier le matricule réel de cet élève et le corriger si besoin'
    })
    if (doublons.has(e.id)) ajouter(e.id, {
      code: 'doublon', niveau: 'rouge',
      message: `Doublon possible dans la même classe : ${doublons.get(e.id).map(d => `${d.matricule} ${d.nom} ${d.prenom}`).join(', ')}`,
      aFaire: 'Vérifier si c’est la même personne : si oui, fusionner ou supprimer la fiche en trop (les doublons faussent les effectifs et les montants)'
    })
  })
  return resultat
}

export const STYLE_SIGNALEMENT = {
  rouge: { texte: 'text-red-700', fond: 'bg-red-50', bordure: 'border-red-300', puce: '🔴' },
  orange: { texte: 'text-orange-700', fond: 'bg-orange-50', bordure: 'border-orange-300', puce: '🟠' }
}

export const niveauMax = (liste) => (liste?.some(s => s.niveau === 'rouge') ? 'rouge' : liste?.length ? 'orange' : null)

export { estManquant }
