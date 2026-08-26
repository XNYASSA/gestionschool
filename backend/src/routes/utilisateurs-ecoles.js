import express from 'express'
import bcryptjs from 'bcryptjs'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL USERS (Super Admin only)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateurs = await req.prisma.utilisateur.findMany({
      include: {
        utilisateurEcoles: {
          include: { ecole: true }
        }
      },
      orderBy: { nom: 'asc' }
    })

    res.json(utilisateurs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET USER ECOLES
router.get('/:utilisateurId/ecoles', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur consulte ses propres données ou est Super Admin
    if (req.user.id !== req.params.utilisateurId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const utilisateurEcoles = await req.prisma.utilisateurEcole.findMany({
      where: { utilisateurId: req.params.utilisateurId },
      include: { ecole: true }
    })

    res.json(utilisateurEcoles)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE USER (Super Admin only)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, email, motDePasse, role } = req.body

    if (!nom || !email || !motDePasse || !role) {
      return res.status(400).json({ error: 'Champs requis manquants' })
    }

    const motDePasseHash = await bcryptjs.hash(motDePasse, 10)

    const utilisateur = await req.prisma.utilisateur.create({
      data: {
        nom,
        email,
        motDePasse: motDePasseHash,
        role
      }
    })

    res.status(201).json({
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// ASSIGN USER TO ECOLE WITH ROLE (Super Admin only)
router.post('/:utilisateurId/assign-ecole', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { ecoleId, role } = req.body

    if (!ecoleId || !role) {
      return res.status(400).json({ error: 'ecoleId et role requis' })
    }

    // Vérifier que l'utilisateur et l'école existent
    const [utilisateur, ecole] = await Promise.all([
      req.prisma.utilisateur.findUnique({ where: { id: req.params.utilisateurId } }),
      req.prisma.ecole.findUnique({ where: { id: ecoleId } })
    ])

    if (!utilisateur || !ecole) {
      return res.status(404).json({ error: 'Utilisateur ou école non trouvé' })
    }

    // Créer ou mettre à jour la relation
    const utilisateurEcole = await req.prisma.utilisateurEcole.upsert({
      where: {
        utilisateurId_ecoleId: {
          utilisateurId: req.params.utilisateurId,
          ecoleId: ecoleId
        }
      },
      create: {
        utilisateurId: req.params.utilisateurId,
        ecoleId: ecoleId,
        role
      },
      update: { role }
    })

    res.json(utilisateurEcole)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// REMOVE USER FROM ECOLE (Super Admin only)
router.delete('/:utilisateurId/ecoles/:ecoleId', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await req.prisma.utilisateurEcole.delete({
      where: {
        utilisateurId_ecoleId: {
          utilisateurId: req.params.utilisateurId,
          ecoleId: req.params.ecoleId
        }
      }
    })

    res.json({ message: 'Utilisateur retiré de l\'école' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Relation non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DEACTIVATE USER (Super Admin only)
router.patch('/:utilisateurId/deactivate', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.update({
      where: { id: req.params.utilisateurId },
      data: { actif: false }
    })

    res.json({ message: 'Utilisateur désactivé', utilisateur })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// ACTIVATE USER (Super Admin only)
router.patch('/:utilisateurId/activate', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.update({
      where: { id: req.params.utilisateurId },
      data: { actif: true }
    })

    res.json({ message: 'Utilisateur activé', utilisateur })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
