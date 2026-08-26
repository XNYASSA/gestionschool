import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import bcryptjs from 'bcryptjs'

const router = express.Router()

// GET - Lister tous les utilisateurs (Admin uniquement)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateurs = await req.prisma.utilisateur.findMany({
      where: { actif: true },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(utilisateurs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Obtenir un utilisateur par ID
router.get('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
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

// PUT - Modifier son propre profil (l'utilisateur lui-même)
router.put('/profil/moi', verifyToken, async (req, res) => {
  try {
    const { nom, email } = req.body
    const userId = req.user.id

    const dataToUpdate = {}
    if (nom) dataToUpdate.nom = nom
    if (email) {
      // Vérifier que le nouvel email n'existe pas déjà
      const existingUser = await req.prisma.utilisateur.findUnique({
        where: { email }
      })
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
      dataToUpdate.email = email
    }

    const utilisateur = await req.prisma.utilisateur.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        nom: true,
        email: true,
        role: true
      }
    })

    res.json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Changer son mot de passe
router.put('/profil/changer-mot-de-passe', verifyToken, async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body
    const userId = req.user.id

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({
        error: 'Ancien et nouveau mot de passe requis'
      })
    }

    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: userId }
    })

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Vérifier l'ancien mot de passe
    const motDePasseValide = await bcryptjs.compare(ancienMotDePasse, utilisateur.motDePasse)
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' })
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcryptjs.hash(nouveauMotDePasse, 10)

    await req.prisma.utilisateur.update({
      where: { id: userId },
      data: { motDePasse: hashedPassword }
    })

    res.json({ message: 'Mot de passe modifié avec succès' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Créer un nouvel utilisateur (Admin uniquement)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
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
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
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
router.put('/:id/toggle-statut', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
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
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
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
