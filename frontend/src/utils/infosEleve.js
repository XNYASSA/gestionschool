// Informations obligatoires d'un élève qui peuvent manquer après l'import d'un fichier de scolarité
// (le parent et son téléphone sont alors enregistrés « Non renseigné »).
export const NON_RENSEIGNE = 'Non renseigné'

export const estManquant = (valeur) => {
  const texte = String(valeur ?? '').trim().toLowerCase()
  return texte === '' || texte === NON_RENSEIGNE.toLowerCase()
}

// Liste des informations à compléter : [{ champ, libelle }]
export function informationsManquantes(eleve) {
  const manquantes = []
  if (estManquant(eleve?.prenom)) manquantes.push({ champ: 'prenom', libelle: 'Prénom' })
  if (estManquant(eleve?.nomParent)) manquantes.push({ champ: 'nomParent', libelle: 'Nom du parent' })
  if (estManquant(eleve?.telephoneParent)) manquantes.push({ champ: 'telephoneParent', libelle: 'Téléphone du parent' })
  return manquantes
}

// Valeur à afficher / exporter : vide quand l'information n'a pas été renseignée
export const valeurOuVide = (valeur) => (estManquant(valeur) ? '' : valeur)
