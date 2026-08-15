#!/bin/bash

echo "🚀 TDB École Privée - Démarrage Complet"
echo "========================================"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Installez-le d'abord."
    exit 1
fi

echo "✅ Node.js détecté: $(node --version)"
echo ""

# Installer les dépendances du backend
echo "📦 Initialisation du backend..."
cd backend || exit
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dépendances backend installées"
else
    echo "❌ Erreur lors de l'installation des dépendances backend"
    exit 1
fi

# Initialiser la base de données
echo "🗄️  Initialisation de la base de données..."
npx prisma migrate deploy > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Base de données créée"
else
    echo "⚠️  Erreur lors des migrations (la BD existe peut-être déjà)"
fi

# Peupler les données
echo "🌱 Peuplement des données de démo..."
node prisma/seed.js > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Données de démo créées"
fi

cd ..

# Installer les dépendances du frontend
echo ""
echo "📦 Initialisation du frontend..."
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dépendances frontend installées"
else
    echo "❌ Erreur lors de l'installation des dépendances frontend"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ SETUP COMPLET!"
echo ""
echo "Maintenant, ouvrez deux terminaux:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run dev"
echo ""
echo "Ouvrez http://localhost:5173"
echo "========================================"
