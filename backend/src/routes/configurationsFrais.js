import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL CONFIGURATIONS
router.get('/', verifyToken, async (req, res) => {
  try {
    const configs = await req.prisma.configurationFrais.findMany({
      include: {
        section: true,
        tranches: { orderBy: { numero: 'asc' } }
      },
      orderBy: { sectionId: 'asc' }
    })
    res.json(configs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET CONFIGURATION BY SECTION
router.get('/section/:sectionId', verifyToken, async (req, res) => {
  try {
    const config = await req.prisma.configurationFrais.findUnique({
      where: { sectionId: req.params.sectionId },
      include: {
        section: true,
        tranches: { orderBy: { numero: 'asc' } }
      }
    })
    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE CONFIGURATION (Admin only)
router.post('/', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const { sectionId, montantInscription, montantFraisTotal, tranches } = req.body

    if (!sectionId) {
      return res.status(400).json({ error: 'Le champ sectionId est obligatoire' })
    }

    const config = await req.prisma.configurationFrais.create({
      data: {
        sectionId,
        montantInscription: montantInscription || 50000,
        montantFraisTotal: montantFraisTotal || 80000,
        tranches: {
          create: tranches || [
            { numero: 1, montant: 30000 },
            { numero: 2, montant: 25000 },
            { numero: 3, montant: 25000 }
          ]
        }
      },
      include: {
        section: true,
        tranches: { orderBy: { numero: 'asc' } }
      }
    })
    res.status(201).json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE CONFIGURATION (Admin only)
router.put('/:id', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const { montantInscription, montantFraisTotal } = req.body

    const config = await req.prisma.configurationFrais.update({
      where: { id: req.params.id },
      data: {
        ...(montantInscription && { montantInscription }),
        ...(montantFraisTotal && { montantFraisTotal })
      },
      include: {
        section: true,
        tranches: { orderBy: { numero: 'asc' } }
      }
    })
    res.json(config)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// UPDATE TRANCHE (Admin only)
router.put('/:configId/tranches/:trancheNum', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const { montant } = req.body
    const { configId, trancheNum } = req.params

    const tranche = await req.prisma.tranche.update({
      where: {
        configurationFraisId_numero: {
          configurationFraisId: configId,
          numero: parseInt(trancheNum)
        }
      },
      data: { montant }
    })
    res.json(tranche)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tranche non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
