# TDB École Privée - Backend API

API REST pour la gestion scolaire complète (Écoles privées d'Afrique).

## Stack Technologique

- **Node.js + Express** - Framework API
- **Prisma** - ORM (accès base de données)
- **SQLite** - Base de données locale (dev), scalable vers PostgreSQL
- **JWT** - Authentification
- **Bcrypt** - Hachage des mots de passe

## Installation & Démarrage Rapide

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configurer la base de données

```bash
# Créer le schéma et la base SQLite
npx prisma migrate deploy

# Peupler avec les données de démo
node prisma/seed.js
```

### 3. Lancer le serveur API

```bash
npm run dev
```

L'API est accessible sur `http://localhost:3001`

## Endpoints Principaux

### Authentification
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Info utilisateur
- `POST /api/auth/logout` - Déconnexion

### Ressources
- `GET /api/eleves` - Lister élèves
- `POST /api/eleves` - Créer élève (Secrétaire)
- `GET /api/frais` - Lister frais
- `POST /api/frais/enregistrer-paiement` - Paiement (Secrétaire)
- `GET /api/notes` - Lister notes
- `POST /api/notes` - Créer note (Enseignant)
- `GET /api/presences` - Lister présences
- `POST /api/presences` - Enregistrer présence (Enseignant)
- `GET /api/personnel` - Lister personnel
- `GET /api/dashboard` - Dashboard (rôle-spécifique)

## Comptes de Démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Propriétaire | paulette@school.cm | demo123 |
| Directeur | yves@school.cm | demo123 |
| Secrétaire | marie@school.cm | demo123 |
| Enseignant (Math) | ines.math@school.cm | demo123 |
| Enseignant (English) | benjamin.english@school.cm | demo123 |

## Architecture & Déploiement

### Structure
```
backend/
├── src/
│   ├── server.js          # Point d'entrée
│   ├── middleware/
│   │   └── auth.js        # JWT + vérification rôles
│   └── routes/            # Endpoints
├── prisma/
│   ├── schema.prisma      # Modèle de données
│   └── seed.js            # Données de démo
└── .env                   # Config (DATABASE_URL, etc.)
```

### Variables d'Environnement

| Variable | Dev | Prod |
|----------|-----|------|
| `DATABASE_URL` | `file:./dev.db` | `postgresql://...` |
| `NODE_ENV` | `development` | `production` |
| `JWT_SECRET` | `your_secret_key` | Clé sécurisée (vault) |
| `PORT` | `3001` | `3001` |
| `FRONTEND_URL` | `http://localhost:5173` | URL domaine |

### Migration vers VPS (PostgreSQL)

1. **Changer le provider Prisma**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Définir DATABASE_URL**:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/tdb_ecole"
   ```

3. **Exécuter les migrations**:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed  # Optionnel si données de prod existantes
   ```

## Sécurité

- ✅ Authentification JWT
- ✅ Mots de passe hashés (bcrypt)
- ✅ Vérification des rôles côté serveur
- ✅ CORS configuré pour frontend local
- ⚠️ **À faire en prod**: utiliser HTTPS, clé JWT sécurisée, rate-limiting

## Développement

### Visualiser la base de données

```bash
npx prisma studio
```

Ouvre une UI sur `http://localhost:5555`

### Créer une nouvelle migration

```bash
npx prisma migrate dev --name nom_de_la_migration
```

### Vérifier les erreurs Prisma

```bash
npx prisma validate
```

## Troubleshooting

### "SQLITE_CANTOPEN: unable to open database file"
Vérifier que le dossier `prisma/` existe et qu'on a les permissions d'écriture.

### "JWT expired"
Tokens JWT expirent après 7 jours. Renouveler avec une nouvelle connexion.

### "Prisma Client failed to generate"
```bash
npx prisma generate
```

## Intégration Frontend

Le frontend (React + Vite) appelle cette API:

```javascript
// src/api/client.js
const API_URL = 'http://localhost:3001/api'

export const login = async (email, motDePasse) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, motDePasse })
  })
  return response.json()
}
```

## Licences & Crédits

MIT License - Développé pour TDB École Privée
