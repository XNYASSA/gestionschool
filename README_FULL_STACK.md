# TDB École Privée - Full Stack

Application complète de gestion scolaire (React Frontend + Node.js Backend).

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js 16+**
- **npm**

### Option 1: Lancer les deux serveurs (Recommandé)

**Terminal 1 - Backend API**:
```bash
cd backend
npm install
npx prisma migrate deploy  # Créer la base de données
node prisma/seed.js        # Peupler les données de démo
npm run dev                # Serveur sur http://localhost:3001
```

**Terminal 2 - Frontend React**:
```bash
npm install
npm run dev                # App sur http://localhost:5173
```

Ouvrez `http://localhost:5173` dans votre navigateur.

## 📝 Se Connecter

Utilisez les comptes de démo:

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| 👑 Propriétaire | paulette@school.cm | demo123 |
| 👔 Directeur | yves@school.cm | demo123 |
| 💼 Secrétaire | marie@school.cm | demo123 |
| 👨‍🏫 Enseignant (Math) | ines.math@school.cm | demo123 |
| 👨‍🏫 Enseignant (English) | benjamin.english@school.cm | demo123 |

## 📂 Structure du Projet

```
gestionschool/
├── frontend/                    # Application React (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/              # Composants des pages
│   │   ├── components/         # Composants réutilisables
│   │   ├── context/            # Contextes (Auth, App)
│   │   ├── api/               # Appels API
│   │   └── utils/             # Utilitaires
│   ├── package.json
│   └── vite.config.js
│
└── backend/                     # API Node.js + Prisma
    ├── src/
    │   ├── server.js          # Point d'entrée
    │   ├── middleware/        # Auth, CORS, etc.
    │   └── routes/            # Endpoints API
    ├── prisma/
    │   ├── schema.prisma      # Modèle de données
    │   └── seed.js            # Données de démo
    ├── package.json
    └── .env                   # Configuration

```

## 🔌 Communication Frontend ↔ Backend

Le frontend appelle l'API REST via fetch/axios:

```javascript
// Exemple: Connexion
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, motDePasse })
})
const { token, utilisateur } = await response.json()
// Token stocké en localStorage et utilisé pour les requêtes suivantes
```

## 🛡️ Sécurité

- ✅ **JWT** - Authentification stateless
- ✅ **Bcrypt** - Mots de passe hashés
- ✅ **Vérification rôles** - Contrôle d'accès côté serveur
- ✅ **CORS** - Configuration stricte par rôle
- ⚠️ **À faire en production**: HTTPS, secrets vault, rate-limiting

## 🗄️ Base de Données

### Local (SQLite)
```
backend/prisma/dev.db  # Fichier local créé automatiquement
```

### Production (PostgreSQL)

Éditer `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Définir dans `.env`:
```
DATABASE_URL="postgresql://user:pwd@host:5432/tdb_ecole"
```

## 📖 Documentation Détaillée

- **[Backend README](./backend/README.md)** - API, routes, déploiement
- **[Frontend README](./README.md)** - React, composants, intégration

## 🧪 Tester l'API

### Avec cURL

```bash
# Connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"paulette@school.cm","motDePasse":"demo123"}'

# Récupérer élèves (avec token)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3001/api/eleves
```

### Avec Prisma Studio

```bash
cd backend
npx prisma studio
```

Ouvre UI interactive sur `http://localhost:5555`

## 🚢 Déploiement VPS

### 1. Backend (Node.js)

```bash
# Sur le VPS
git clone <repo>
cd backend
npm ci --production
npx prisma migrate deploy
npm start  # Ou avec PM2: pm2 start npm --name tdb -- start
```

### 2. Frontend (build statique)

```bash
cd frontend
npm run build
# Servir dist/ avec nginx/Apache
```

### 3. Configuration

```bash
# Backend .env (prod)
DATABASE_URL="postgresql://..."
NODE_ENV="production"
JWT_SECRET="<clé-sécurisée-depuis-vault>"
FRONTEND_URL="https://votredomaine.com"
PORT="3001"
```

## 🆘 Troubleshooting

### Frontend ne peut pas se connecter au backend
- Vérifier que le backend s'écoute bien sur `http://localhost:3001`
- Vérifier CORS dans `backend/src/server.js`
- Vérifier les en-têtes `Authorization` dans les requêtes frontend

### Erreur "Database locked" (SQLite)
- Une seule instance backend à la fois
- Fermer Prisma Studio si ouvert

### Port déjà utilisé
```bash
# Trouver le processus
lsof -i :3001  # Backend
lsof -i :5173  # Frontend

# Ou changer le port dans .env / vite.config.js
```

## 📊 Architecture Prête pour Croissance

- ✅ Séparation frontend/backend claire
- ✅ ORM (Prisma) indépendant du provider BD
- ✅ Authentification JWT (stateless)
- ✅ Contrôle d'accès par rôle côté serveur
- ✅ API REST standard (facile à versioner)
- ✅ Prêt pour PostgreSQL/VPS

## 📝 Notes de Développement

- **Variables d'env**: Créer un `.env.local` pour les surcharges locales
- **Hot reload**: Activate dans `vite.config.js` et `backend/server.js`
- **Logs**: Voir `console.log()` dans le serveur backend
- **Migrations BD**: `npx prisma migrate dev` crée une migration auto

## 🎯 Prochaines Étapes

1. Améliorer la gestion des erreurs (validation input, messages clairs)
2. Ajouter des logs structurés (pino, winston)
3. Tester les permissions côté serveur (security audit)
4. Mettre en cache (Redis) pour les dashboards lourd s
5. Mettre en place la CI/CD (GitHub Actions)

---

**Besoin d'aide?** Vérifier la doc détaillée:
- Frontend: `README.md`
- Backend: `backend/README.md`
