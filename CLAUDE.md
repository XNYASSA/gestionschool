# TDB École Privée — Contexte projet

> Ce fichier est chargé automatiquement par Claude Code au début de chaque
> session. Il évite d'avoir à réexpliquer le projet à chaque prompt.
> Ne pas coller ce contexte dans le chat — il est déjà connu.



# Instructions du projet

## Objectif
Développer et maintenir cette application sans modifier inutilement le code existant.

## Règles générales
- Répondre en français, sauf si le code ou la documentation impose l'anglais.
- Lire uniquement les fichiers nécessaires à la tâche.
- Ne jamais analyser tout le dépôt sans justification.
- Avant toute modification, identifier les fichiers concernés et expliquer brièvement le plan.
- Ne pas réécrire un fichier complet lorsqu'une modification ciblée suffit.
- Préserver l'architecture, les conventions et les dépendances existantes.
- Ne pas créer de nouvelle dépendance sans l'expliquer.
- Ne jamais lire, afficher ou modifier les secrets contenus dans les fichiers `.env`.

## Méthode de travail
1. Reformuler la tâche en une phrase.
2. Inspecter uniquement les fichiers directement concernés.
3. Proposer un plan court si plusieurs fichiers sont impliqués.
4. Modifier le minimum nécessaire.
5. Exécuter uniquement les tests pertinents.
6. Signaler les fichiers modifiés, les tests exécutés et les éventuels risques.

## Recherche de fichiers
- Utiliser la recherche ciblée plutôt qu'une lecture globale du dépôt.
- Ne pas lire `node_modules`, `dist`, `build`, `coverage` ou les fichiers générés, sauf demande explicite.
- Pour une question locale, demander ou utiliser le chemin précis du fichier concerné.

## Format de réponse
Après chaque tâche, répondre avec :
- Résultat : une phrase.
- Fichiers modifiés : liste courte.
- Tests : commande exécutée et résultat.
- À vérifier : uniquement s'il reste un risque.

## Compact instructions
Lors d'une compression de contexte, préserver :
- Les décisions d'architecture.
- Les fichiers modifiés.
- Les erreurs et résultats de tests.
- Les contraintes explicitement données par l'utilisateur.

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
