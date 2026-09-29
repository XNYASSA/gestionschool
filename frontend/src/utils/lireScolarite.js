// Lecture des fichiers de scolarité tenus par les secrétaires : un classeur avec une feuille par
// classe, chaque feuille ayant une ligne d'en-têtes placée n'importe où dans les premières lignes,
// puis un élève par ligne. Deux formes d'en-têtes sont reconnues :
//  - noms regroupés : "Noms et Prénoms", "Classe", "Mle", "Pension Total", "Inscription",
//    "Tranche 1/2/3", "reste"... (le nom complet est ensuite scindé) ;
//  - noms séparés, plus détaillé : "Nom élève", "Prénom élève", "Matricule", "Date de naissance",
//    "Nom du père", "Nom de la mère", "Téléphone parent", "Adresse", "Inscription",
//    "Tranche 1/2", "Solde restant", "Remarques"...

const normaliser = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Valeur d'une cellule ExcelJS : texte enrichi, résultat de formule ou date compris
function valeurCellule(valeur) {
  if (valeur === null || valeur === undefined) return null
  if (valeur instanceof Date) return valeur
  if (typeof valeur === 'object') {
    if (valeur.richText) return valeur.richText.map(t => t.text).join('')
    if ('result' in valeur) return valeur.result ?? null
    if ('text' in valeur) return valeur.text
    return null
  }
  return valeur
}

const texte = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

function montant(v) {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0
  const n = Number(String(v).replace(/[\s ]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : 0
}

// "SANGA NANGA ARMELLE PAOLA" -> nom "SANGA NANGA", prénom "ARMELLE PAOLA" : les noms de famille
// sont écrits en premier, la moitié (arrondie au-dessus) des mots forme le nom, le reste le prénom.
export function separerNomPrenom(nomComplet) {
  const mots = texte(nomComplet).split(' ').filter(Boolean)
  if (mots.length <= 1) return { nom: mots[0] || '', prenom: '' }
  const nbNom = Math.ceil(mots.length / 2)
  return { nom: mots.slice(0, nbNom).join(' '), prenom: mots.slice(nbNom).join(' ') }
}

const COLONNES_RECONNUES = [
  ['nomEleve', (h) => h === 'nomeleve'],
  ['prenomEleve', (h) => h === 'prenomeleve'],
  ['nom', (h) => h.startsWith('nom') && h !== 'nomeleve' && h !== 'nompere' && h !== 'nomdupere' && h !== 'nommere' && h !== 'nomdelamere'],
  ['classe', (h) => h === 'classe'],
  ['matricule', (h) => h === 'mle' || h.startsWith('matricule')],
  ['pensionTotal', (h) => h === 'pensiontotal'],
  ['netAPayer', (h) => h === 'netpayer'],
  ['inscription', (h) => h.startsWith('inscription')],
  ['tranche1', (h) => h === 'tranche1'],
  ['tranche2', (h) => h === 'tranche2'],
  ['tranche3', (h) => h === 'tranche3'],
  ['soldeRestant', (h) => h.includes('solde')],
  ['dateNaissance', (h) => h.startsWith('date') && h.includes('naissance')],
  ['nomPere', (h) => h.includes('pere')],
  ['nomMere', (h) => h.includes('mere')],
  ['telephoneParent', (h) => h.includes('telephone')],
  ['adresse', (h) => h === 'adresse'],
  ['remarque', (h) => h.startsWith('remarque')]
]

function reperer(entetes) {
  const index = {}
  entetes.forEach((h, i) => {
    for (const [cle, test] of COLONNES_RECONNUES) {
      if (index[cle] === undefined && test(h)) { index[cle] = i; break }
    }
  })
  return index
}

const MOTS_LIGNE_TOTAL = /^(total|totaux|caisse|sous total|recap)/
const VIDE = /^(n\/?a|na|-)?$/i

const estRenseigne = (v) => v && !VIDE.test(texte(v))

// Date de naissance en ISO ("2017-01-10") à partir d'une cellule Excel (Date, "N/A", "10/04/2022"...)
function dateNaissanceISO(cru) {
  if (cru instanceof Date) return cru.toISOString().slice(0, 10)
  const t = texte(cru)
  if (!estRenseigne(t)) return ''
  const jjmmaaaa = t.match(/^(\d{1,2})[/\- ](\d{1,2})[/\- ](\d{4})$/)
  if (jjmmaaaa) return `${jjmmaaaa[3]}-${jjmmaaaa[2].padStart(2, '0')}-${jjmmaaaa[1].padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ''
}

// Le père est retenu comme contact par défaut ; à défaut la mère ; les deux peuvent être absents ("N/A").
function choisirParent(nomPere, nomMere) {
  if (estRenseigne(nomPere)) return { nomParent: texte(nomPere), lieuParente: 'Père' }
  if (estRenseigne(nomMere)) return { nomParent: texte(nomMere), lieuParente: 'Mère' }
  return { nomParent: '', lieuParente: '' }
}

// Lit une feuille ; retourne null si elle ne ressemble pas à une feuille de scolarité.
function lireFeuille(feuille) {
  const limite = Math.min(feuille.rowCount, 25)
  let ligneEntete = 0
  let index = null
  for (let r = 1; r <= limite && !index; r++) {
    const cellules = []
    const ligne = feuille.getRow(r)
    for (let c = 1; c <= Math.min(feuille.columnCount, 30); c++) cellules.push(normaliser(valeurCellule(ligne.getCell(c).value)))
    const candidat = reperer(cellules)
    const aUnNom = candidat.nom !== undefined || (candidat.nomEleve !== undefined && candidat.prenomEleve !== undefined)
    if (aUnNom && candidat.inscription !== undefined && candidat.tranche1 !== undefined) {
      index = candidat
      ligneEntete = r
    }
  }
  if (!index) return null
  const nomsSepares = index.nomEleve !== undefined && index.prenomEleve !== undefined

  const eleves = []
  const anomalies = []
  const lire = (ligne, cle) => (index[cle] === undefined ? null : valeurCellule(ligne.getCell(index[cle] + 1).value))

  for (let r = ligneEntete + 1; r <= feuille.rowCount; r++) {
    const ligne = feuille.getRow(r)
    const nomComplet = nomsSepares ? `${texte(lire(ligne, 'nomEleve'))} ${texte(lire(ligne, 'prenomEleve'))}`.trim() : texte(lire(ligne, 'nom'))
    const paiements = { inscription: montant(lire(ligne, 'inscription')), tranche1: montant(lire(ligne, 'tranche1')), tranche2: montant(lire(ligne, 'tranche2')), tranche3: montant(lire(ligne, 'tranche3')) }
    const soldeRestant = montant(lire(ligne, 'soldeRestant'))
    const total = paiements.inscription + paiements.tranche1 + paiements.tranche2 + paiements.tranche3

    if (!nomComplet) {
      if (total > 0) anomalies.push(`Ligne ${r} : des montants (${total.toLocaleString('fr-FR')} FCFA) sans nom d'élève`)
      continue
    }
    if (MOTS_LIGNE_TOTAL.test(normaliser(nomComplet)) || /^\d+$/.test(nomComplet)) continue

    // "N/A" est une valeur de remplissage fréquente dans ce type de fiche, y compris pour le prénom
    const prenomBrut = nomsSepares ? texte(lire(ligne, 'prenomEleve')) : null
    const { nom, prenom } = nomsSepares
      ? { nom: texte(lire(ligne, 'nomEleve')), prenom: estRenseigne(prenomBrut) ? prenomBrut : '' }
      : separerNomPrenom(nomComplet)
    const { nomParent, lieuParente } = choisirParent(lire(ligne, 'nomPere'), lire(ligne, 'nomMere'))
    const dateNaissance = dateNaissanceISO(lire(ligne, 'dateNaissance'))
    const telephoneParentBrut = texte(lire(ligne, 'telephoneParent'))
    const adresseBrute = texte(lire(ligne, 'adresse'))
    const remarque = texte(lire(ligne, 'remarque'))
    const matriculeBrut = texte(lire(ligne, 'matricule'))
    // Pension totale de la classe reconstituée à partir du solde restant quand le fichier ne la donne pas directement
    const pensionTotalDirecte = montant(lire(ligne, 'pensionTotal'))

    eleves.push({
      ligneExcel: r,
      nomComplet,
      nom,
      prenom,
      classeTexte: texte(lire(ligne, 'classe')),
      matricule: estRenseigne(matriculeBrut) ? matriculeBrut : '',
      pensionTotal: pensionTotalDirecte || (soldeRestant > 0 || index.soldeRestant !== undefined ? total + soldeRestant : 0),
      ...(estRenseigne(nomParent) && { nomParent, lieuParente }),
      ...(estRenseigne(dateNaissance) && { dateNaissance }),
      ...(estRenseigne(telephoneParentBrut) && { telephoneParent: telephoneParentBrut }),
      ...(estRenseigne(adresseBrute) && { adresseParent: adresseBrute }),
      ...(estRenseigne(remarque) && { remarque }),
      ...paiements
    })
  }
  return { ligneEntete, eleves, anomalies }
}

// Lit tout le classeur : une entrée par feuille, avec ses élèves (ou une raison si ignorée).
export function lireClasseurScolarite(classeur) {
  return classeur.worksheets.map(feuille => {
    const lue = lireFeuille(feuille)
    if (!lue) return { nom: feuille.name, ignoree: 'aucun en-tête de scolarité reconnu', eleves: [], anomalies: [] }
    return { nom: feuille.name, ...lue }
  })
}
