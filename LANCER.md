# 🚀 Lancer TDB École Privée - Phase 2

## ✅ Initialisation Terminée!

✓ Backend dépendances installées  
✓ Base de données créée (SQLite)  
✓ Données de démo peuplées  
✓ Frontend dépendances installées

## 📋 Lancer l'Application

### Option 1: Deux terminaux (Recommandé)

**Terminal 1 - Backend API:**
```bash
cd backend
npm run dev
```

Vous verrez:
```
🚀 API serveur lancé sur http://localhost:3001
📊 Frontend attendu sur http://localhost:5173
```

**Terminal 2 - Frontend React:**
```bash
npm run dev
```

Vous verrez:
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
```

### Option 2: Une ligne PowerShell (Parallèle)

```powershell
Start-Process { cd backend; npm run dev } -NoNewWindow -PassThru & npm run dev
```

## 🔐 Se Connecter

Ouvrez **http://localhost:5173** dans votre navigateur.

### Comptes de Démo Disponibles:

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| 👑 Propriétaire | paulette@school.cm | demo123 |
| 👔 Directeur | yves@school.cm | demo123 |
| 💼 Secrétaire | marie@school.cm | demo123 |
| 👨‍🏫 Prof. Math | ines.math@school.cm | demo123 |
| 👨‍🏫 Prof. English | benjamin.english@school.cm | demo123 |

**Astuce:** Cliquez sur un profil de démo pour vous connecter instantanément!

## 📊 Ce qui Fonctionne

✅ **Authentification JWT** - Connexion sécurisée  
✅ **Dashboard du Propriétaire** - Vue stratégique complète  
✅ **Affichage des Élèves** - Hiérarchie section→classe→élève  
✅ **Gestion des Frais** - Tableau des paiements  
✅ **Contrôle d'Accès** - Permissions par rôle  
✅ **Formatage des Montants** - Montants complets en FCFA

## 🧪 Tester l'API Directement

```bash
# Connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"paulette@school.cm","motDePasse":"demo123"}'

# Réponse exemple:
# {"token":"eyJ...","utilisateur":{"id":"...","nom":"Mme Paulette NKONGA","email":"paulette@school.cm","role":"PROPRIETAIRE"}}
```

## 📈 Architecture en Action

```
Frontend (React)          Backend (Node.js)         Database (SQLite)
   |                          |                          |
   +--login()------→          auth/login              
   |                          |--verify pwd
   |                          +--generate JWT
   +←--token------+           |
   |              +--user--←--+
   |
   +--GET /dashboard-→       /api/dashboard
   |                          |
   |                          +--Propriétaire check
   +←--KPIs+Élèves+Frais--←---+--query tables
   |                          |
```

## 🛠️ Troubleshooting

### Port déjà utilisé
```bash
# Vérifier quel processus
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Tuer le processus
taskkill /PID <PID> /F
```

### Erreur "Cannot find module"
```bash
# Réinstaller
cd backend
npm install --force

cd ..
npm install --force
```

### Erreur CORS
✓ Vérifiez que le backend s'écoute sur http://localhost:3001  
✓ Vérifiez que .env du backend contient FRONTEND_URL=http://localhost:5173  
✓ Vérifiez que le frontend appelle http://localhost:3001/api

## 📝 Fichiers Importants

```
.env                          # Configuration VITE_API_URL
src/api/client.js             # Client API centralisé
src/context/AuthContext.jsx   # Authentification JWT
src/hooks/useDashboard.js     # Hook pour les données

backend/.env                  # Config DB, JWT_SECRET, FRONTEND_URL
backend/src/server.js         # Serveur Express
backend/prisma/schema.prisma  # Schéma de données
backend/prisma/seed.js        # Données de démo
```

## 🎯 Phase 2 - Prochaines Étapes

Une fois la connexion vérifiée:

- [ ] Ajouter formulaires manquants (inscription élève, paiement)
- [ ] Implémenter enregistrement de présences
- [ ] Créer interface de notation
- [ ] Tester chaque rôle complètement
- [ ] Ajouter validations côté serveur

## 📞 Besoin d'Aide?

Vérifiez:
- Console du navigateur (F12) pour erreurs frontend
- Terminal du backend pour erreurs serveur  
- README_FULL_STACK.md pour architecture générale

---

**Status:** ✅ Phase 2 - Intégration Frontend ↔ Backend COMPLÈTE

**Prêt pour:** Testing local + Formulation des formulaires manquants
