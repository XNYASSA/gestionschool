# 🎓 TDB École - Système de Gestion Scolaire

Application web complète de gestion scolaire pour les écoles privées francophones, anglophones et techniques au Cameroun. Système de rôles et permissions complet avec dashboards adaptés à chaque utilisateur.

## 📁 Structure du projet

Le projet est maintenant organisé en **2 dossiers principaux**:

```
gestionschool/
├── frontend/          🎨 React + Vite + Tailwind CSS
├── backend/           🔌 Node.js + Express + Prisma
└── README.md          📖 Ce fichier
```

## 🚀 Démarrage Rapide (Développement local)

### Prérequis

- Node.js 16+ et npm
- Git

### Installation

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev
# Écoute sur http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
# Accessible sur http://localhost:5173
```

L'application s'ouvrira automatiquement dans votre navigateur sur `http://localhost:5173`.

## 👥 Système de Rôles et Permissions

L'application propose **4 rôles distincts** avec des accès et des interfaces adaptés:

### 1️⃣ **Propriétaire / Promoteur** 🏛️
- **Accès**: Tous les modules (vue stratégique)
- **Dashboard**: Vue condensée avec KPIs cliquables (drill-down)
- **Fonctionnalités**: Accès total aux paramètres, finances globales, tous les rapports
- **Perspective**: "Pilotage" — indicateurs et tendances, pas de saisie directe

### 2️⃣ **Directeur / Principal** 👨‍💼
- **Accès**: Tous modules sauf certains paramètres stratégiques
- **Dashboard**: Opérationnel avec tâches en attente de validation
- **Fonctionnalités**: Peut valider paiements, notes, gestion personnel
- **Perspective**: "Management" — supervision et validation des process

### 3️⃣ **Secrétaire** 👩‍💻
- **Accès**: Élèves, Frais & Paiements uniquement (PAS de Finances globales)
- **Dashboard**: Simplifié, centré sur tâches administratives (paiements impayés, relances)
- **Fonctionnalités**: Saisie de paiements, gestion des fiches élèves
- **Perspective**: "Administratif" — données restreintes, sans vision stratégique

### 4️⃣ **Enseignants** 👩‍🏫 (3 profils d'exemple)
- **Accès**: UNIQUEMENT ses classes et ses matières
- **Visible**: Notes, Présences, Tableau de bord limité
- **PAS d'accès**: Finances, Personnel, autres classes/matières
- **Exemple**: Prof de Maths voit uniquement 6ème A, 5ème B, 4ème A (ses classes) et uniquement les notes en Mathématiques
- **Perspective**: "Pédagogique" — complète séparation par classe/matière

## 📋 Fonctionnalités Démontrées

### 1. **Tableau de Bord** 📊
- Vue synthétique temps réel (effectifs, frais collectés, taux de présence)
- Alertes sur les paiements impayés
- Top 5 meilleurs élèves
- Répartition des statuts de paiement
- Résumé financier du mois

### 2. **Gestion des Élèves** 👥
- Liste complète avec recherche et filtres
- Filtrage par classe, système (MINESEC/GCE) et statut de paiement
- Fiches détaillées avec infos de paiement
- Historique des frais de scolarité

### 3. **Frais & Paiements** 💰
- **Enregistrement de paiements en direct** - simulez un paiement mobile money et voyez le statut se mettre à jour immédiatement
- Tableau complet des frais avec statuts colorés (Soldé/Partiel/Impayé)
- **Liste de relances** pour les impayés avec numéros de téléphone des parents
- Support des modes de paiement: Orange Money, MTN MoMo, Wave, Espèces, Virement Bancaire

### 4. **Notes & Bulletins** 📚
- Saisie des notes par matière avec coefficients
- **Générateur de bulletin automatique** - un bulletin PDF prêt à imprimer/partager
- Calcul en direct de moyennes pondérées
- Attribution automatique des mentions (Insuffisant/Passable/Assez Bien/Bien/Très Bien)
- Classement des élèves par classe

### 5. **Suivi de Présence** ✅
- Taux de présence par élève avec alertes automatiques
- Alerte visuelle si absentéisme > seuil (75%)
- Statistiques globales
- Tri par taux de présence

### 6. **Personnel & Finances** 💼
- Liste du personnel avec salaires
- Calcul automatique de la masse salariale
- **Résumé financier complet**: recettes vs dépenses vs résultat net
- Analyses financières (ratios, coûts par élève)
- Bénéfice/déficit du mois

### 7. **Paramètres** ⚙️
- **Grilles de frais centralisées** (deux systèmes indépendants: MINESEC et GCE)
- Configuration par niveau/classe
- Barème de notation avec mentions
- Informations de l'établissement

## 🎯 Données de Démonstration

- **École**: Collège Rosa-Parks, Yaoundé
- **Élèves**: 12 élèves répartis entre MINESEC (6ème-Terminale) et GCE (Form 1-Upper Sixth)
- **Effectif**: ~50% de frais collectés pour illustrer des cas réels
- **Absentéisme**: Quelques élèves avec alertes pour démontrer la fonctionnalité
- **Notes**: Notes réalistes avec coefficients, permettant de générer des bulletins

## 🎨 Design

- Interface moderne SaaS (type Notion, Linear)
- Thème sombre pour la navigation, clair pour le contenu
- Responsive design (desktop, tablette, mobile)
- Micro-interactions fluides (transitions, hover effects)
- Icônes cohérentes (lucide-react)

## 💡 Points Clés à Démontrer au Client

1. **Une seule saisie, tout se met à jour** - Enregistrez un paiement et voyez le tableau de bord, la fiche élève et les rapports se mettre à jour automatiquement

2. **Système bilingue natif** - Deux grilles de frais indépendantes (MINESEC/GCE) avec calculs automatiques

3. **Bulletins instantanés** - Sélectionnez un élève, générez son bulletin complet avec notes, moyennes, mention et rang

4. **Relances simplifiées** - Liste d'impayés avec numéros de téléphone des parents pour les appels directs

5. **Tableau de bord décisionnel** - Tous les KPIs importants en un coup d'œil

6. **Configuration centralisée** - Modifiez les frais une seule fois, tout l'application se met à jour

## 🛠️ Stack Technologique

- **React 18** - Interface utilisateur
- **Vite** - Build tool moderne et rapide
- **Tailwind CSS** - Styling
- **Lucide React** - Icônes
- **Context API** - Gestion d'état

## 📱 Responsive

L'application est entièrement responsive et s'adapte parfaitement à:
- Écrans de bureau (1920px+)
- Tablettes (768px-1024px)
- Mobiles (jusqu'à 375px)

## 🚀 Prêt pour la Production

Pour compiler pour la production:

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`.

## 📝 Notes Importantes

- Toutes les données sont mockées en local (pas de backend)
- L'application fonctionne sans connexion internet
- Les données se réinitialisent au rafraîchissement de la page (cela peut être remplacé par une base de données réelle)
- Les modales et dialogues sont pleinement fonctionnels

## 👤 Utilisateur de Démo

- **Nom**: Dr. Jean-Claude Ngadjeu
- **Rôle**: Directeur
- **Établissement**: Collège Rosa-Parks, Yaoundé

Vous pouvez modifier les données en éditant les fichiers dans `src/data/mockData.js`.

---

**Prêt à impressionner votre client?** 🎯 Lancez l'application et naviguez entre les sections!
