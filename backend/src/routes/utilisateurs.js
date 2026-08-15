import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import bcryptjs from 'bcryptjs'

const router = express.Router()

// GET - Lister tous les utilisateurs (Admin uniquement)
router.get('/', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const utilisateurs = await req.prisma.utilisateur.findMany({
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true
      }
    })
    res.json(utilisateurs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Obtenir un utilisateur par ID
router.get('/:id', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true,
        updatedAt: true
      }
    })
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Créer un nouvel utilisateur (Admin uniquement)
router.post('/', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const { nom, email, motDePasse, role } = req.body

    if (!nom || !email || !motDePasse || !role) {
      return res.status(400).json({
        error: 'Champs obligatoires: nom, email, motDePasse, role'
      })
    }

    // Vérifier si l'email existe déjà
    const existingUser = await req.prisma.utilisateur.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    // Hacher le mot de passe
    const hashedPassword = await bcryptjs.hash(motDePasse, 10)

    const utilisateur = await req.prisma.utilisateur.create({
      data: {
        nom,
        email,
        motDePasse: hashedPassword,
        role: role.toUpperCase(),
        actif: true
      },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true
      }
    })

    res.status(201).json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Modifier un utilisateur
router.put('/:id', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const { nom, motDePasse, role } = req.body

    const dataToUpdate = {}
    if (nom) dataToUpdate.nom = nom
    if (role) dataToUpdate.role = role.toUpperCase()
    if (motDePasse) {
      dataToUpdate.motDePasse = await bcryptjs.hash(motDePasse, 10)
    }

    const utilisateur = await req.prisma.utilisateur.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true
      }
    })

    res.json(utilisateur)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

// PUT - Suspendre/Activer un utilisateur
router.put('/:id/toggle-statut', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id }
    })

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const updatedUser = await req.prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { actif: !utilisateur.actif },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true
      }
    })

    res.json({
      ...updatedUser,
      message: updatedUser.actif ? 'Utilisateur activé' : 'Utilisateur suspendu'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE - Supprimer un utilisateur (Admin uniquement)
router.delete('/:id', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    // Supprimer les données associées
    const user = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id },
      include: { enseignant: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Si c'est un enseignant, supprimer ses associations
    if (user.enseignant) {
      await req.prisma.enseignantClasseMatiere.deleteMany({
        where: { enseignantId: user.enseignant.id }
      })
      await req.prisma.enseignant.delete({
        where: { id: user.enseignant.id }
      })
    }

    // Supprimer l'utilisateur
    await req.prisma.utilisateur.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Utilisateur supprimé avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
