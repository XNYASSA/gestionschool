import { proposerClasse, canonClasse } from './appariementClasses.js'
import { typeTechnique } from './filieres.js'

const formatFCFA = (m) => `${(m || 0).toLocaleString('fr-FR')} FCFA`

// Groupes d'élèves d'un fichier de scolarité à rapprocher d'une classe : une ligne par feuille et par
// classe écrite dans la colonne « Classe » (ou, pour les feuilles techniques A1-A4 / Y1-Y4, par
// classe déduite de la pension). `classes` : { id, nom, niveau, ecoleId } ; `totauxBareme` : 'ecoleId|niveau' -> montant total.
// Chaque groupe : { cle, feuille, classeTexte, eleves, paye, suggestion, ecart, aVerifier, motif }.
export function construireGroupes(feuilles, classes, ecoleId, totauxBareme) {
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
}
