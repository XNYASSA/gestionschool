# 🚀 Setup - Intégration Frontend ↔ Backend

## Phase 2: Intégration API

Le frontend est maintenant connecté au backend API. Voici comment démarrer:

### 1️⃣ Initialiser le Backend

```bash
# Terminal 1
cd backend
npm install
npx prisma migrate deploy    # Créer la BD
node prisma/seed.js          # Peupler les données
npm run dev                   # Lance sur http://localhost:3001
```

### 2️⃣ Démarrer le Frontend

```bash
# Terminal 2
npm install
npm run dev                   # Lance sur http://localhost:5173
```

### 3️⃣ Tester la Connexion

Ouvrez `http://localhost:5173` et connectez-vous avec un compte de démo:

- **Propriétaire**: paulette@school.cm / demo123
- **Directeur**: yves@school.cm / demo123
- **Secrétaire**: marie@school.cm / demo123
- **Prof. Math**: ines.math@school.cm / demo123
- **Prof. English**: benjamin.english@school.cm / demo123

## 📝 Changements Effectués

### Frontend
✅ Créé `src/api/client.js` - Client API centralisé avec gestion du token JWT
✅ Mis à jour `src/context/AuthContext.jsx` - Authentification via API
✅ Mis à jour `src/pages/LoginProfessional.jsx` - Connexion avec appels API
✅ Créé `src/hooks/useDashboard.js` - Hook pour récupérer les données du dashboard
✅ Mis à jour `src/pages/DashboardOwnerEnhanced.jsx` - Données de l'API
✅ Créé `.env` - Configuration VITE_API_URL

### Backend
✅ Prêt à démarrer (créé en phase 1)
✅ Inclut: Auth, Élèves, Frais, Notes, Présences, Personnel, Dashboard

## 🔧 Troubleshooting

### Erreur "Cannot find module '@prisma/client'"
```bash
cd backend
npm install
```

### Port 3001 déjà utilisé
```bash
# Vérifier quel processus l'utilise
lsof -i :3001
```

### Erreur CORS
Vérifiez que le backend écoute sur http://localhost:3001 et que le frontend est sur http://localhost:5173

## 📋 Prochaines Étapes

- [ ] Tester la connexion avec chaque rôle
- [ ] Vérifier que le dashboard affiche les données correctes
- [ ] Ajouter les formulaires manquants (inscription élève, paiement, notes, etc.)
- [ ] Tester les permissions par rôle côté serveur
