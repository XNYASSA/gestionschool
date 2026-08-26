import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import { checkEcoleAccess } from '../middleware/checkEcoleAccess.js'

const router = express.Router()

// GET ANNONCES BY ECOLE
router.get('/:ecoleId', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    const annonces = await req.prisma.annonce.findMany({
      where: {
        ecoleId: req.params.ecoleId,
        actif: true
      },
      include: {
        creeePar: {
          select: { id: true, nom: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(annonces)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE ANNONCE (Principal/Directrice only)
router.post('/:ecoleId', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    const { titre, contenu } = req.body

    if (!titre || !contenu) {
      return res.status(400).json({ error: 'titre et contenu requis' })
    }

    // Vérifier que l'utilisateur est Principal ou Directrice
    if (req.ecoleRole !== 'PRINCIPAL' && req.ecoleRole !== 'DIRECTRICE' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Seuls les Principals/Directrices peuvent créer des annonces' })
    }

    const annonce = await req.prisma.annonce.create({
      data: {
        titre,
        contenu,
        ecoleId: req.params.ecoleId,
        creeeParId: req.user.id
      },
      include: {
        creeePar: {
          select: { id: true, nom: true, email: true }
        }
      }
    })

    res.status(201).json(annonce)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// UPDATE ANNONCE (Créateur ou Super Admin)
router.put('/:annonceId', verifyToken, async (req, res) => {
  try {
    const { titre, contenu } = req.body

    const annonce = await req.prisma.annonce.findUnique({
      where: { id: req.params.annonceId }
    })

    if (!annonce) {
      return res.status(404).json({ error: 'Annonce non trouvée' })
    }

    // Vérifier que c'est le créateur ou SUPER_ADMIN
    if (annonce.creeeParId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const annonceUpdated = await req.prisma.annonce.update({
      where: { id: req.params.annonceId },
      data: {
        ...(titre && { titre }),
        ...(contenu && { contenu })
      },
      include: {
        creeePar: {
          select: { id: true, nom: true, email: true }
        }
      }
    })

    res.json(annonceUpdated)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// DEACTIVATE ANNONCE (Créateur ou Super Admin)
router.delete('/:annonceId', verifyToken, async (req, res) => {
  try {
    const annonce = await req.prisma.annonce.findUnique({
      where: { id: req.params.annonceId }
    })

    if (!annonce) {
      return res.status(404).json({ error: 'Annonce non trouvée' })
    }

    // Vérifier que c'est le créateur ou SUPER_ADMIN
    if (annonce.creeeParId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    await req.prisma.annonce.update({
      where: { id: req.params.annonceId },
      data: { actif: false }
    })

    res.json({ message: 'Annonce supprimée' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
