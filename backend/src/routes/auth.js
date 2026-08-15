import express from 'express'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse, roleSelected } = req.body

    if (!email || !motDePasse) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { email }
    })

    if (!utilisateur) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const motDePasseValide = await bcryptjs.compare(motDePasse, utilisateur.motDePasse)

    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ error: 'Compte suspendu' })
    }

    // Vérifier le rôle si sélectionné (pas requis pour Propriétaire)
    if (roleSelected && utilisateur.role !== 'PROPRIETAIRE') {
      if (roleSelected !== utilisateur.role) {
        return res.status(403).json({ error: 'Rôle incorrect pour ce compte' })
      }
    }

    const token = jwt.sign(
      {
        id: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role,
        nom: utilisateur.nom
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur lors de la connexion' })
  }
})

// GET CURRENT USER
router.get('/me', verifyToken, async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: req.user.id }
    })

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    res.json({
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' })
  }
})

// LOGOUT (juste côté frontend, mais endpoint pour confirmer)
router.post('/logout', verifyToken, (req, res) => {
  res.json({ message: 'Déconnexion réussie' })
})

export default router
