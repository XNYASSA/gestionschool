import { nomFichierSur } from './exportTableau'
import { valeurOuVide } from './infosEleve'
import { typeTechnique } from './filieres'
import { COLONNES_MODELE } from './modeleImport'

const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const parNomPrenom = (a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')

// Date de naissance en JJ/MM/AAAA, lue en UTC : elle est enregistrée à minuit UTC, un affichage en
// heure locale pourrait la décaler d'un jour selon le fuseau de l'appareil.
export function formatDateNaissance(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

const libelleSexe = (e) => (e.sexe === 'MASCULIN' ? 'M' : e.sexe === 'FEMININ' ? 'F' : '')
const texte = (v) => String(v ?? '').trim()

// Colonnes et lignes d'une liste d'élèves. Sur papier / PDF le lien de parenté suit le nom du parent
// et l'email / l'adresse sont omis (la page ne les contient pas lisiblement) ; l'Excel les détaille.
function tableauEleves(liste, { excel, technique, avecClasse, avecEcole }) {
  const colonnes = [
    { titre: 'N°', centre: true, largeur: 9 },
    { titre: 'Matricule', largeur: 22 },
    { titre: 'Nom' },
    { titre: 'Prénom' },
    { titre: 'Sexe', centre: true, largeur: 12 },
    { titre: 'Date de naissance', centre: true, largeur: 24 },
    { titre: 'Lieu de naissance' },
    ...(avecEcole ? [{ titre: 'École', largeur: 26 }] : []),
    ...(avecClasse ? [{ titre: 'Classe', largeur: 24 }] : []),
    ...(technique ? [{ titre: 'Filière' }] : []),
    { titre: 'Redoublant', centre: true, largeur: 20 },
    { titre: 'Parent / tuteur' },
    ...(excel ? [{ titre: 'Lien de parenté' }] : []),
    { titre: 'Téléphone parent', largeur: 32 },
    ...(excel ? [{ titre: 'Email parent' }, { titre: 'Adresse parent' }] : [])
  ]

  const lignes = [...liste].sort(parNomPrenom).map((e, i) => {
    const parent = valeurOuVide(e.nomParent)
    const lien = texte(e.lieuParente)
    return [
      i + 1, e.matricule || '', e.nom, e.prenom, libelleSexe(e),
      formatDateNaissance(e.dateNaissance), texte(e.lieuNaissance),
      ...(avecEcole ? [e.classe?.ecole?.nomCourt || ''] : []),
      ...(avecClasse ? [e.classe?.nom || ''] : []),
      ...(technique ? [e.filiere || ''] : []),
      e.redouble ? 'Oui' : '',
      excel ? parent : `${parent}${parent && lien ? ` (${lien})` : ''}`,
      ...(excel ? [lien] : []),
      valeurOuVide(e.telephoneParent),
      ...(excel ? [texte(e.emailParent), texte(e.adresseParent)] : [])
    ]
  })
  return { colonnes, lignes }
}

// Liste des élèves complète (état civil, parent). `format` : 'excel' (détaillé) ou autre (PDF / impression).
// Par défaut une section (page / feuille) par classe ; `tableauUnique` regroupe toutes les classes dans
// un seul tableau avec une colonne « Classe ». `eleves` : élèves avec leur classe (et son école).
export function exportListeEleves(eleves, { critere = '', format = 'pdf', tableauUnique = false } = {}) {
  const excel = format === 'excel'
  const parClasse = new Map()
  eleves.forEach(e => {
    const cle = e.classe?.id || e.classeId || 'sans-classe'
    if (!parClasse.has(cle)) parClasse.set(cle, { classe: e.classe, eleves: [] })
    parClasse.get(cle).eleves.push(e)
  })

  const groupes = [...parClasse.values()].sort((a, b) =>
    (a.classe?.ecole?.nomCourt || '').localeCompare(b.classe?.ecole?.nomCourt || '', 'fr') || (a.classe?.nom || '').localeCompare(b.classe?.nom || '', 'fr'))
  const ecoles = [...new Set(groupes.map(g => g.classe?.ecole?.nomCourt).filter(Boolean))]

  if (tableauUnique) {
    // Ordre école > classe > nom : chaque classe est triée par nom, puis la numérotation est continue
    const options = { excel, technique: groupes.some(g => !!typeTechnique(g.classe)), avecClasse: true, avecEcole: ecoles.length > 1 }
    const { colonnes } = tableauEleves([], options)
    const lignesTriees = groupes.flatMap(g => tableauEleves(g.eleves, options).lignes)
    const libelleEcole = ecoles.length === 1 ? ecoles[0] : 'Toutes les écoles'
    return {
      sections: [{
        titre: `LISTE DES ÉLÈVES — ${libelleEcole}`,
        nomFeuille: 'Élèves',
        paysage: true,
        entete: [`Effectif : ${eleves.length}${critere ? ` — ${critere}` : ''}`, `Édité le ${aujourdhui()}`],
        colonnes,
        lignes: lignesTriees.map((l, i) => [i + 1, ...l.slice(1)])
      }],
      nomFichier: `liste-eleves-${nomFichierSur(libelleEcole)}`
    }
  }

  const sections = groupes.map(({ classe, eleves: liste }) => {
    const technique = !!typeTechnique(classe)
    const { colonnes, lignes } = tableauEleves(liste, { excel, technique, avecClasse: false, avecEcole: false })
    return {
      titre: `LISTE DES ÉLÈVES — ${classe?.nom || 'Sans classe'}`,
      nomFeuille: classe ? `${classe.ecole?.nomCourt || ''} ${classe.nom}`.trim() : 'Sans classe',
      paysage: true,
      entete: [
        `${classe?.ecole?.nomCourt || ''}${classe?.ecole?.nomCourt ? ' — ' : ''}Effectif : ${liste.length}${critere ? ` — ${critere}` : ''}`,
        `Édité le ${aujourdhui()}`
      ],
      colonnes,
      lignes
    }
  })

  const unique = groupes.length === 1 ? groupes[0].classe : null
  return {
    sections,
    nomFichier: `liste-eleves-${nomFichierSur(unique ? `${unique.ecole?.nomCourt || ''}-${unique.nom}` : 'par-classe')}`
  }
}

// Fichier Excel « à compléter » : les élèves affichés au format exact du modèle d'import (1 ligne d'en-têtes,
// sans les colonnes de paiement), avec les cases d'état civil vides surlignées. Une fois remplies, le fichier se
// réimporte tel quel (Élèves → Importer des élèves) : les élèves existants sont reconnus par nom, prénom et classe,
// seules les cases renseignées sont mises à jour, aucun paiement n'est touché.
export async function telechargerFichierACompleter(eleves, nomEcole) {
  const { default: ExcelJS } = await import('exceljs')
  const colonnes = COLONNES_MODELE.filter(c => !['inscription', 'tranche1', 'tranche2', 'tranche3'].includes(c.cle))
  const aCompleter = new Set(['sexe', 'dateNaissance', 'lieuNaissance'])

  const classeur = new ExcelJS.Workbook()
  const feuille = classeur.addWorksheet('Élèves')
  feuille.addRow(colonnes.map(c => c.titre))
  feuille.getRow(1).font = { bold: true }
  feuille.views = [{ state: 'frozen', ySplit: 1 }]

  const valeurs = (e) => ({
    matricule: e.matricule || '', nom: e.nom, prenom: e.prenom, sexe: libelleSexe(e),
    dateNaissance: formatDateNaissance(e.dateNaissance), lieuNaissance: texte(e.lieuNaissance),
    classe: e.classe?.nom || '', nomParent: valeurOuVide(e.nomParent), lieuParente: texte(e.lieuParente),
    telephoneParent: valeurOuVide(e.telephoneParent), emailParent: texte(e.emailParent), adresseParent: texte(e.adresseParent)
  })

  const ordonnes = [...eleves].sort((a, b) =>
    (a.classe?.nom || '').localeCompare(b.classe?.nom || '', 'fr') || parNomPrenom(a, b))
  ordonnes.forEach(e => {
    const v = valeurs(e)
    const ligne = feuille.addRow(colonnes.map(c => v[c.cle] ?? ''))
    colonnes.forEach((c, i) => {
      if (aCompleter.has(c.cle) && !v[c.cle]) {
        ligne.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C4' } }
      }
      // Les dates restent du texte JJ/MM/AAAA : Excel ne les convertit pas
      if (c.cle === 'dateNaissance' || c.cle === 'telephoneParent') ligne.getCell(i + 1).numFmt = '@'
    })
  })
  feuille.columns.forEach((col, i) => { col.width = Math.max(14, Math.min(34, colonnes[i].titre.length + 4)) })

  const tampon = await classeur.xlsx.writeBuffer()
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  lien.download = `eleves-a-completer-${nomFichierSur(nomEcole || 'ecole')}.xlsx`
  lien.click()
  URL.revokeObjectURL(lien.href)
}

// Liste du personnel (une section) : sans salaire, la liste pouvant être diffusée.
export function exportListePersonnel(personnel, { libelleEcole = 'Toutes les écoles', libelleRole, estSansConnexion }) {
  return {
    sections: [{
      titre: 'LISTE DU PERSONNEL',
      nomFeuille: 'Personnel',
      paysage: true,
      entete: [`${libelleEcole} — Effectif : ${personnel.length}`, `Édité le ${aujourdhui()}`],
      colonnes: [
        { titre: 'N°', centre: true, largeur: 10 },
        { titre: 'Nom et prénom' },
        { titre: 'Fonction' },
        { titre: 'Rôle' },
        { titre: 'École(s)' },
        { titre: 'Téléphone', largeur: 32 },
        { titre: 'Email' },
        { titre: 'Statut', centre: true, largeur: 20 }
      ],
      lignes: [...personnel].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map((p, i) => [
        i + 1,
        p.nom,
        p.fonction || libelleRole(p.role),
        libelleRole(p.role),
        (p.utilisateurEcoles || []).map(ue => ue.ecole.nomCourt).join(', '),
        p.telephone || '',
        estSansConnexion(p.email) ? '' : p.email || '',
        p.actif ? 'Actif' : 'Inactif'
      ])
    }],
    nomFichier: `liste-personnel-${nomFichierSur(libelleEcole)}`
  }
}
