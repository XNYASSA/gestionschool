# TDB École - Frontend

Frontend React + Vite pour l'application de gestion scolaire TDB École.

## 🚀 Démarrage rapide

### Installation

```bash
npm install
```

### Développement

```bash
npm run dev
```

L'app se lance sur `http://localhost:5173`

### Build pour la production

```bash
npm run build
```

Génère un dossier `dist/` prêt pour le déploiement.

## 📋 Environnement

Créez un fichier `.env` à la racine du frontend:

```env
VITE_API_URL=http://localhost:3001/api
```

Pour la production, créez `.env.production`:

```env
VITE_API_URL=https://votre-backend-url.com/api
```

## 🏗️ Structure

```
src/
├── api/              # Client API
├── components/       # Composants réutilisables
├── context/          # Contexte React (Auth, App)
├── data/             # Données mock
├── hooks/            # Hooks personnalisés
├── pages/            # Pages principales
├── utils/            # Utilitaires
└── main.jsx          # Point d'entrée
```

## 🎨 Technologies

- React 18
- Vite 4
- Tailwind CSS
- Lucide React (icônes)

## 👥 Rôles utilisateurs

- **Admin (Propriétaire)** - Accès total
- **Directeur** - Gestion pédagogique
- **Secrétaire** - Gestion administrative
- **Enseignant** - Ses classes et notes

## 📦 Déploiement

### Vercel

1. Connectez votre repo GitHub
2. Vercel détecte Vite automatiquement
3. Variables d'env: `VITE_API_URL`
4. Deploy!

```bash
vercel --prod
```

## ⚠️ Notes

- Le backend doit être déployé séparément
- L'URL de l'API doit être accessible depuis le navigateur
- CORS doit être configuré sur le backend pour le domaine Vercel
