# Spécifications fonctionnelles détaillées v3 — Application de gestion scolaire multi-établissements

## ⚠️ CADRE DE LA MISSION

Ce document est le prompt de référence pour la suite du développement. Il s'appuie sur les documents précédents (`prompt-restructuration-app-scolaire.md`, `corrections-app-scolaire.md`, `cadrage-technique-v2-app-scolaire.md`) et les met à jour sur plusieurs points. Il ne remplace pas l'architecture déjà construite — il détaille précisément, dashboard par dashboard, les écrans, boutons et parcours à développer.

---

## 0. Mises à jour par rapport aux documents précédents

| Sujet | Ancienne version | Décision finale |
|---|---|---|
| Encaissement | Hésitation Secrétaire/Économat | **L'Économat est la source officielle de l'encaissement** (elle enregistre la transaction qui met à jour le solde réel de l'élève). La Secrétaire continue de déclarer de son côté les montants qu'elle a vu passer, à des fins de comparaison (triangulation anti-anomalie). Les deux tâches coexistent, aucune n'exclut l'autre. |
| Évaluation par compétences | Réservée maternelle/primaire | **Étendue à tous les établissements** — les notes sur 20 ET l'évaluation par compétences sont disponibles pour toutes les écoles, y compris les 4 collèges. |
| Notifications SMS | Envisagées | **Non retenues pour cette phase.** Ne pas développer d'intégration SMS. |
| Espace Parent / Espace Élève | Priorisé en fin de roadmap | **Reporté indéfiniment.** L'application reste un outil interne (client + employés) pour cette phase. Ne pas développer ces espaces maintenant. |
| Secrétaires multiples | Une secrétaire par établissement supposée unique | **Chaque école a sa/ses propre(s) secrétaire(s), strictement isolée(s).** La secrétaire du collège (Principal) n'a accès à aucune donnée des écoles maternelle/primaire, et inversement. Un poste peut être occupé par une ou plusieurs personnes, et une même personne peut occuper plusieurs postes sur plusieurs écoles. |

---

## 0bis. Structure des écoles et des classes à créer (données de départ)

⚠️ **À valider avec le client avant implémentation.** La liste de classes ci-dessous est une proposition basée sur les usages courants du système éducatif camerounais. Elle sert de point de départ pour que Claude Code crée la structure en base de données, mais les libellés exacts (notamment pour CRP Technique, qui dépend des filières réellement proposées) doivent être confirmés ou corrigés par le client avant la mise en production.

| École | Niveau | Classes proposées |
|---|---|---|
| CRP FRANCOPHONE | Collège (système francophone) | 6ème, 5ème, 4ème, 3ème |
| CRP ANGLOPHONE | Collège (système anglophone) | Form 1, Form 2, Form 3, Form 4, Form 5 |
| CRP TECHNIQUE | Collège technique | *À confirmer avec le client selon les filières réellement enseignées (ex. 1ère année, 2ème année par filière, ou nomenclature CAP/Probatoire technique).* |
| CBM (Collège bilingue les Master) | Collège (bilingue) | 6ème, 5ème, 4ème, 3ème |
| EBSB (École bilingue Steve Biko) | Maternelle + Primaire | Maternelle : Petite Section, Moyenne Section, Grande Section — Primaire : SIL, CP, CE1, CE2, CM1, CM2 |
| EBRP (École bilingue Rosa Parks) | Maternelle + Primaire | Maternelle : Petite Section, Moyenne Section, Grande Section — Primaire : SIL, CP, CE1, CE2, CM1, CM2 |

**Instruction pour Claude Code :**
- Créer les 6 écoles avec leur nom complet, nom court et niveau (voir table `École` déjà existante).
- Créer les classes listées ci-dessus, rattachées à leur école (table `Classe`).
- Pour CRP Technique, créer une structure de classes provisoire modifiable facilement (le client doit pouvoir ajouter/renommer les classes lui-même depuis le dashboard Super Admin — section 1.3), plutôt que coder cette liste en dur.
- Prévoir que le Super Admin puisse à tout moment ajouter, renommer ou supprimer une classe pour n'importe laquelle des 6 écoles, sans intervention technique — c'est déjà couvert par la fonctionnalité CRUD classe de la section 1.3.

---

## 1. Dashboard Super Admin (Client) — enrichissement complet

Le tableau de bord doit avoir un **menu latéral** listant toutes les sections ci-dessous, avec accès à l'ensemble des fonctionnalités des autres rôles.

### 1.1 Vue analytique multi-niveaux
- Filtres croisés : par école, par classe, par nom d'élève.
- Récapitulatif financier avec sélecteur de période : jour / semaine / mois — entrées d'argent et sorties d'argent, avec un total affiché sous chaque ensemble de chiffres.
- Objectif : que le Super Admin sache immédiatement, en détail ou de façon globale, s'il perd ou gagne de l'argent sur la période choisie, et où vont ses postes de dépense.

### 1.2 Suivi des paiements élèves
- Liste des élèves avec 3 statuts : **Soldé** / **Non soldé** / **Partiellement soldé**.
- Chaque ligne affiche le nom du parent et son numéro de téléphone.
- Code couleur obligatoire pour distinguer visuellement les 3 statuts (ex. vert = soldé, orange = partiel, rouge = non soldé).

### 1.3 Gestion des entités
- CRUD élève (le seul rôle autorisé à supprimer un élève déjà validé).
- CRUD personnel (administratif et enseignant).
- CRUD école, CRUD classe.
- Attribution des écoles aux managers : assigner un Principal à un ou plusieurs collèges, une Directrice à une ou plusieurs écoles maternelle/primaire.

### 1.4 Gestion des comptes personnel (nouveau, détaillé)
- Le Super Admin crée, modifie, supprime et attribue lui-même les comptes de tout le personnel administratif (secrétaires, économats, etc.), en les reliant à l'école ou aux écoles souhaitées.
- Un poste (ex. "Secrétaire de EBSB") peut être occupé par une ou plusieurs personnes.
- Une personne peut occuper plusieurs postes sur plusieurs écoles.
- Important : deux secrétaires de deux écoles différentes ne doivent jamais voir les données l'une de l'autre — l'isolation se fait strictement par l'école assignée.

### 1.5 Modalités de paiement
- Définir les tranches de paiement et leurs dates limites de règlement (déjà prévu en v2, à confirmer dans l'implémentation).

### 1.6 Autres fonctions
- Générer un bulletin.
- Publier des annonces.
- Module Dépenses (voir section 6 ci-dessous).

### 1.7 Exigence de design
- Interface épurée, professionnelle, simple à comprendre.
- Code couleur cohérent pour interpréter rapidement les types de message/statut (ex. rouge = alerte/impayé, vert = validé/soldé, orange = en attente).
- Barre latérale + menu structurés reprenant toutes les fonctions listées ci-dessus.

---

## 2. Dashboard Principal / Directrice

### 2.1 Élèves
- Créer, ajouter, modifier et valider l'inscription d'un élève.
- Ne peut pas supprimer un élève une fois l'inscription validée.

### 2.2 Emploi du temps
- Gérer et valider l'emploi du temps (reprend le module déjà prévu, avec validation explicite par ce rôle).

### 2.3 Personnel & discipline professionnelle
- Voir la liste du personnel administratif et enseignant de son/ses établissement(s).
- Appliquer des sanctions pour faute professionnelle.

### 2.4 Vie scolaire des élèves — discipline
Parcours détaillé à implémenter :
1. **Consultation du dossier** : accéder à la fiche de l'élève pour consulter l'historique de son comportement et les détails d'un incident.
2. **Prise de sanction / Convocation** : saisir la décision (ex. avertissement, conseil de discipline) et générer une convocation officielle.
3. **Notification** : valider l'envoi de la convocation au parent via l'application, et noter qu'un envoi par courrier est aussi prévu (fonctionnalité de génération du document à imprimer, pas d'envoi postal automatisé).

### 2.5 Présences
- Voir les présences/absences des élèves déclarées par les enseignants.
- Appliquer des sanctions liées à l'absentéisme si nécessaire.

### 2.6 Annonces
- Publier des annonces à l'attention du personnel.

### 2.7 Bulletins
- Générer les bulletins de plusieurs élèves d'un coup, ou d'un seul élève.

### 2.8 Suivi pédagogique
- Voir l'évolution de la progression pédagogique (cahier de textes / avancement du programme), par école et par classe.

### 2.9 Différence Principal / Directrice
- La Directrice a exactement les mêmes droits que le Principal, mais restreints aux seules écoles qui lui sont affectées par le Super Admin.
- La secrétaire de la Directrice est une personne différente de la secrétaire du Principal — chaque secrétaire n'a accès qu'aux données de l'école dont son supérieur direct a la charge.

---

## 3. Dashboard Secrétaire

### 3.1 Inscription d'un nouvel élève — parcours détaillé
1. **Accès au formulaire** : ouvrir le module "Vie scolaire" et sélectionner "Nouvel élève".
2. **Saisie des données** : renseigner l'état civil, le contact des parents, les antécédents médicaux ; téléverser les justificatifs reçus.
3. **Validation & génération** : valider le dossier — le système crée le profil, attribue un identifiant unique (matricule), et génère automatiquement la carte scolaire et le certificat d'inscription.
4. **Contrainte obligatoire** : le numéro de téléphone valide du parent est requis pour valider la création du profil — sans ce champ rempli, le profil ne peut pas être validé.

### 3.2 Déclaration des paiements
- La secrétaire enregistre également les montants des frais de pension qu'elle a vu passer pour chaque élève.
- Ces données doivent être structurées pour permettre l'analyse journalière/hebdomadaire/mensuelle du Super Admin, en croisement avec les données de l'Économat et la validation du Principal/de la Directrice (triangulation anti-anomalie déjà prévue).

### 3.3 Notes — lecture seule
- La secrétaire peut voir les notes des élèves, sans pouvoir les modifier.
- Seul l'enseignant peut saisir/modifier une note tant qu'elle n'est pas validée et envoyée.
- Une fois la note validée et envoyée par l'enseignant, seuls le Principal ou la Directrice peuvent encore la modifier.

### 3.4 Gestion des absences
1. **Recherche de la fiche** : identifier l'élève concerné via une barre de recherche rapide.
2. **Mise à jour du statut** : accéder à la liste des absences saisies par l'enseignant, et faire passer le statut d'"Injustifiée" à "Justifiée".
3. **Archivage** : téléverser la pièce justificative (certificat médical, mot des parents) dans le dossier de l'élève.

### 3.5 Bulletins
- Peut générer un ou plusieurs bulletins en PDF.

---

## 4. Dashboard Économat

Parcours détaillé à implémenter :
1. **Identification de l'élève** : rechercher l'élève dans le module "Finances & Recouvrement".
2. **Consultation du solde** : visualiser le tableau de facturation (échéances passées, montants dus, pénalités éventuelles).
3. **Saisie de la transaction** : cliquer sur "Enregistrer un paiement", saisir le montant encaissé, choisir le mode de règlement (espèces, virement, Mobile Money).
4. **Validation** : valider la transaction — le solde de l'élève se met à jour en temps réel (cette transaction est la source officielle qui fait foi pour le solde réel de l'élève).
5. **Export du rapport** : générer un état financier récapitulatif pour la direction, présentant la liste des créances restantes.
6. **Filtrage des retards** : filtre dédié "Factures en retard / Échéances dépassées".
7. **Sélection globale** : possibilité de cocher l'ensemble des parents débiteurs, ou de filtrer par niveau/classe, en vue d'un export groupé ou de l'édition de courriers de relance (pas de SMS, voir section 0).

---

## 5. Dashboard Enseignant

### 5.1 Présences
1. Cocher les élèves absents ou en retard sur la liste pré-remplie de la classe.
2. Valider la liste — les absences sont directement transmises à la vie scolaire/au secrétariat.
3. Optionnel : ajouter un motif, ou signaler un incident de séance.

### 5.2 Cahier de textes
- Renseigner le travail à faire pour la séance suivante : titre, description, fichiers joints, date de rendu.

### 5.3 Notes et compétences
1. Accéder à l'évaluation concernée.
2. Saisir les notes (sur 20) ou les compétences acquises, élève par élève — les deux modes sont disponibles pour toutes les écoles (voir section 0).
3. **Publication** : publier les notes déclenche la mise à jour du relevé de notes et le recalcul automatique des moyennes globales.

---

## 6. Module Dépenses (Super Admin)

- Un bouton/une section dédiée pour enregistrer les engagements de dépenses.
- Distinguer les **charges fixes** (ex. salaires) et les **charges variables** (ex. matériel, achats ponctuels).
- Filtrage par jour / semaine / mois, avec un total affiché sous chaque ensemble de chiffres.
- Ces données alimentent directement la vue "gain/perte" de la section 1.1.

---

## 7. Fonctionnalités explicitement écartées de cette phase

Pour éviter tout développement hors périmètre :
- ❌ Pas de notifications SMS.
- ❌ Pas d'Espace Parent.
- ❌ Pas d'Espace Élève.

Ces trois éléments restent documentés dans `cadrage-technique-v2-app-scolaire.md` pour une phase future, mais ne doivent pas être développés maintenant.

---

## 8. Ordre d'implémentation suggéré

1. Isolation stricte des données par école (vérifier/renforcer avant tout le reste — condition de base pour la séparation Principal/Directrice et secrétaires multiples).
2. Gestion des comptes personnel par le Super Admin (multi-affectation postes/personnes).
3. Workflow complet d'inscription élève par la Secrétaire (avec génération carte scolaire + certificat).
4. Workflow complet de paiement par l'Économat (avec mise à jour temps réel du solde).
5. Module Dépenses + vue analytique gain/perte du Super Admin.
6. Module Discipline (Principal/Directrice) : dossier élève, sanction, convocation.
7. Cahier de textes + notes/compétences (Enseignant) + lecture seule côté Secrétaire.
8. Bulletins en masse (Principal/Directrice/Secrétaire).
9. Emploi du temps avec validation.