// Colonnes du modèle d'import des élèves (en-têtes exacts attendus en 1ère ligne du fichier).
// Partagé par l'import (lecture / modèle vierge) et par le « fichier à compléter » exporté depuis la liste des élèves.
export const COLONNES_MODELE = [
  { titre: 'Matricule (optionnel)', cle: 'matricule' },
  { titre: 'Nom*', cle: 'nom' },
  { titre: 'Prénom*', cle: 'prenom' },
  { titre: 'Sexe (M/F)', cle: 'sexe' },
  { titre: 'Date de naissance (JJ/MM/AAAA)', cle: 'dateNaissance' },
  { titre: 'Lieu de naissance', cle: 'lieuNaissance' },
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
