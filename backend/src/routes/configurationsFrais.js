import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

const includeFull = {
  ecole: true,
  tranches: { orderBy: { numero: 'asc' } }
}

// GET ALL CONFIGURATIONS
router.get('/', verifyToken, async (req, res) => {
  try {
    const configs = await req.prisma.configurationFrais.findMany({
      include: includeFull,
      orderBy: { ecoleId: 'asc' }
    })
    res.json(configs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET CONFIGURATION BY ECOLE
router.get('/ecole/:ecoleId', verifyToken, async (req, res) => {
  try {
    const config = await req.prisma.configurationFrais.findUnique({
      where: { ecoleId: req.params.ecoleId },
      include: includeFull
    })
    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée pour cette école' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE CONFIGURATION (Admin only)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { ecoleId, montantInscription, dateLimiteInscription, tranches } = req.body

    if (!ecoleId) {
      return res.status(400).json({ error: 'Le champ ecoleId est obligatoire' })
    }

    const trancheData = (tranches && tranches.length > 0)
      ? tranches.map((t, i) => ({
          numero: i + 1,
          montant: t.montant,
          dateLimite: t.dateLimite ? new Date(t.dateLimite) : null
        }))
      : [
          { numero: 1, montant: 30000 },
          { numero: 2, montant: 25000 },
          { numero: 3, montant: 25000 }
        ]

    const montantFraisTotal = (montantInscription || 50000) + trancheData.reduce((sum, t) => sum + t.montant, 0)

    const config = await req.prisma.configurationFrais.create({
      data: {
        ecoleId,
        montantInscription: montantInscription || 50000,
        montantFraisTotal,
        dateLimiteInscription: dateLimiteInscription ? new Date(dateLimiteInscription) : null,
        tranches: { create: trancheData }
      },
      include: includeFull
    })
    res.status(201).json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE CONFIGURATION (montant inscription / date limite inscription) (Admin only)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { montantInscription, dateLimiteInscription } = req.body

    const config = await req.prisma.configurationFrais.update({
      where: { id: req.params.id },
      data: {
        ...(montantInscription !== undefined && { montantInscription }),
        ...(dateLimiteInscription !== undefined && { dateLimiteInscription: dateLimiteInscription ? new Date(dateLimiteInscription) : null })
      },
      include: includeFull
    })

    // Recalculer le montant total (inscription + toutes les tranches)
    const totalTranches = config.tranches.reduce((sum, t) => sum + t.montant, 0)
    const updated = await req.prisma.configurationFrais.update({
      where: { id: req.params.id },
      data: { montantFraisTotal: config.montantInscription + totalTranches },
      include: includeFull
    })

    res.json(updated)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// ADD TRANCHE (Admin only) — permet d'augmenter le nombre de tranches
router.post('/:configId/tranches', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { montant, dateLimite } = req.body
    if (!montant) {
      return res.status(400).json({ error: 'Le montant est obligatoire' })
    }

    const existantes = await req.prisma.tranche.findMany({
      where: { configurationFraisId: req.params.configId },
      orderBy: { numero: 'desc' },
      take: 1
    })
    const prochainNumero = (existantes[0]?.numero || 0) + 1

    const tranche = await req.prisma.tranche.create({
      data: {
        configurationFraisId: req.params.configId,
        numero: prochainNumero,
        montant,
        dateLimite: dateLimite ? new Date(dateLimite) : null
      }
    })

    await recalculerMontantTotal(req.prisma, req.params.configId)
    res.status(201).json(tranche)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE TRANCHE (montant et/ou date limite) (Admin only)
router.put('/:configId/tranches/:trancheNum', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { montant, dateLimite } = req.body
    const { configId, trancheNum } = req.params

    const tranche = await req.prisma.tranche.update({
      where: {
        configurationFraisId_numero: {
          configurationFraisId: configId,
          numero: parseInt(trancheNum)
        }
      },
      data: {
        ...(montant !== undefined && { montant }),
        ...(dateLimite !== undefined && { dateLimite: dateLimite ? new Date(dateLimite) : null })
      }
    })

    await recalculerMontantTotal(req.prisma, configId)
    res.json(tranche)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tranche non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE TRANCHE (Admin only) — permet de réduire le nombre de tranches
router.delete('/:configId/tranches/:trancheNum', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { configId, trancheNum } = req.params

    await req.prisma.tranche.delete({
      where: {
        configurationFraisId_numero: {
          configurationFraisId: configId,
          numero: parseInt(trancheNum)
        }
      }
    })

    await recalculerMontantTotal(req.prisma, configId)
    res.json({ message: 'Tranche supprimée avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tranche non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

async function recalculerMontantTotal(prisma, configId) {
  const config = await prisma.configurationFrais.findUnique({
    where: { id: configId },
    include: { tranches: true }
  })
  if (!config) return
  const totalTranches = config.tranches.reduce((sum, t) => sum + t.montant, 0)
  await prisma.configurationFrais.update({
    where: { id: configId },
    data: { montantFraisTotal: config.montantInscription + totalTranches }
  })
}

export default router
