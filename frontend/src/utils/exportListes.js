import { nomFichierSur } from './exportTableau'

const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const parNomPrenom = (a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')

// Une section (page / feuille) par classe, élèves en ordre alphabétique.
// `eleves` : élèves avec leur classe (et son école) ; `titreSupplementaire` : critère de recherche éventuel.
export function exportListeEleves(eleves, { critere = '' } = {}) {
  const parClasse = new Map()
  eleves.forEach(e => {
    const cle = e.classe?.id || e.classeId || 'sans-classe'
    if (!parClasse.has(cle)) parClasse.set(cle, { classe: e.classe, eleves: [] })
    parClasse.get(cle).eleves.push(e)
  })

  const groupes = [...parClasse.values()].sort((a, b) =>
    (a.classe?.ecole?.nomCourt || '').localeCompare(b.classe?.ecole?.nomCourt || '', 'fr') || (a.classe?.nom || '').localeCompare(b.classe?.nom || '', 'fr'))

  const sections = groupes.map(({ classe, eleves: liste }) => ({
    titre: `LISTE DES ÉLÈVES — ${classe?.nom || 'Sans classe'}`,
    nomFeuille: classe ? `${classe.ecole?.nomCourt || ''} ${classe.nom}`.trim() : 'Sans classe',
    paysage: false,
    entete: [
      `${classe?.ecole?.nomCourt || ''}${classe?.ecole?.nomCourt ? ' — ' : ''}Effectif : ${liste.length}${critere ? ` — ${critere}` : ''}`,
      `Édité le ${aujourdhui()}`
    ],
    colonnes: [
      { titre: 'N°', centre: true, largeur: 10 },
      { titre: 'Matricule', largeur: 24 },
      { titre: 'Nom' },
      { titre: 'Prénom' },
      { titre: 'Sexe', centre: true, largeur: 14 },
      { titre: 'Parent' },
      { titre: 'Téléphone parent', largeur: 34 }
    ],
    lignes: [...liste].sort(parNomPrenom).map((e, i) => [
      i + 1, e.matricule || '', e.nom, e.prenom,
      e.sexe === 'MASCULIN' ? 'M' : e.sexe === 'FEMININ' ? 'F' : '',
      e.nomParent || '', e.telephoneParent || ''
    ])
  }))

  const unique = groupes.length === 1 ? groupes[0].classe : null
  return {
    sections,
    nomFichier: `liste-eleves-${nomFichierSur(unique ? `${unique.ecole?.nomCourt || ''}-${unique.nom}` : 'par-classe')}`
  }
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
