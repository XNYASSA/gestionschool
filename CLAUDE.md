# TDB École Privée — Contexte projet

> Ce fichier est chargé automatiquement par Claude Code au début de chaque
> session. Il évite d'avoir à réexpliquer le projet à chaque prompt.
> Ne pas coller ce contexte dans le chat — il est déjà connu.

## Résumé en une phrase
Web app de gestion scolaire (élèves, notes, finances, présences) pour écoles
privées francophones/anglophones/techniques au Cameroun, avec 4 rôles
utilisateurs à parcours et permissions distincts.

## Stack
- Frontend : React + Vite + Tailwind CSS (dossier `/frontend`)
- Backend : Node.js + Express + Prisma (dossier `/backend`)
- Base de données : SQLite en local (fichier `dev.db`), migrable vers
  PostgreSQL en prod via variable d'environnement — ne jamais dupliquer la
  logique métier pour gérer les deux
- Auth : JWT + bcrypt

## Rôles & permissions (ne pas re-décrire, juste s'y référer)
| Rôle | Périmètre |
|---|---|
| Admin | Accès total, toutes sections/classes |
| Directeur | Tout sauf Paramètres stratégiques |
| Secretaire | Élèves, Inscriptions & Frais, Pensions dues uniquement |
| Enseignant | Ses classes/matières uniquement (voir table `Enseignant_Classe_Matiere`) |

Toute nouvelle route API doit vérifier le rôle **et** le périmètre côté
serveur (pas seulement côté interface).

## Conventions à respecter systématiquement
- Devise : FCFA partout, jamais abrégé (`1 200 000 FCFA`, pas `1,2M`)
- Sections élèves : `Francophone` / `Anglophone` / `Technique` (jamais binaire)
- Tout montant/donnée agrégée doit rester filtrable par classe + section
- Formulaires : validation champs obligatoires + message de confirmation
- Pas de nouvelle dépendance sans nécessité claire — vérifier `package.json`
  avant d'en proposer une nouvelle

## Ce que Claude Code ne doit PAS faire (pour économiser les tokens)
- Ne pas relire l'intégralité du repo à chaque tâche : cibler les fichiers
  concernés (ex. si je parle de "formulaire de paiement", va direct dans
  `frontend/src/pages/InscriptionsFrais` sans scanner tout `/src`)
- Ne pas réafficher le contenu complet d'un fichier après modification si
  seules quelques lignes ont changé — résumer le diff en 2-3 lignes
- Ne pas réexpliquer l'architecture ou les rôles à chaque réponse : ce
  fichier fait foi, y renvoyer brièvement si besoin
- Ne pas proposer plusieurs variantes/options non demandées : implémenter
  directement la solution la plus simple qui respecte les conventions
  ci-dessus, et signaler seulement si un choix bloquant se pose
- Pas de commentaires verbeux dans le code généré — code lisible, commentaires
  seulement sur la logique non évidente (ex. calcul de moyenne pondérée)

## État actuel du projet
- [x] Frontend avec dashboards par rôle et parcours différenciés
- [x] Écran de connexion hybride (formulaire + comptes de démo)
- [ ] Backend API + base de données (en cours)
- [ ] Déploiement VPS (plus tard)

## Comment je vais te parler
Mes prompts seront courts et ciblés ("ajoute X au module Y"). Je ne
redonnerai pas le contexte général — pose une question courte si un point
est ambigu plutôt que de faire des hypothèses larges qui te feraient
regénérer du code inutile.
