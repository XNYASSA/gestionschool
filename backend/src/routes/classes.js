import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET ALL CLASSES — limité aux écoles affectées pour les non-admin
router.get('/', verifyToken, async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const classes = await req.prisma.classe.findMany({
      where: ecoleIds ? { ecoleId: { in: ecoleIds } } : {},
      orderBy: [{ ecoleId: 'asc' }, { nom: 'asc' }],
      include: { ecole: true }
    })
    res.json(classes)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET CLASSE BY ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const classe = await req.prisma.classe.findUnique({
      where: { id: req.params.id },
      include: { eleves: true, enseignantClasseMatieres: true, ecole: true }
    })
    if (!classe) return res.status(404).json({ error: 'Classe non trouvée' })
    res.json(classe)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE CLASSE (Admin only)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { nom, ecoleId, niveau } = req.body

    if (!nom || !ecoleId || !niveau) {
      return res.status(400).json({ error: 'Les champs nom, ecoleId et niveau sont obligatoires' })
    }

    const ecole = await req.prisma.ecole.findUnique({ where: { id: ecoleId } })
    if (!ecole) {
      return res.status(400).json({ error: 'École non trouvée' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(ecoleId)) {
      return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
    }

    const classe = await req.prisma.classe.create({
      data: { nom, ecoleId, niveau },
      include: { ecole: true }
    })
    res.status(201).json(classe)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE CLASSE (Admin only)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { nom, ecoleId, niveau } = req.body

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const classeActuelle = await req.prisma.classe.findUnique({ where: { id: req.params.id } })
      if (!classeActuelle || !ecoleIds.includes(classeActuelle.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cette classe' })
      }
      if (ecoleId && !ecoleIds.includes(ecoleId)) {
        return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
      }
    }

    const classe = await req.prisma.classe.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(ecoleId && { ecoleId }),
        ...(niveau && { niveau })
      },
      include: { ecole: true }
    })
    res.json(classe)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classe non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE CLASSE (Super Admin, ou Principal/Directrice pour leur école) - CASCADE deletes students and their data
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const classe = await req.prisma.classe.findUnique({ where: { id: req.params.id } })
      if (!classe || !ecoleIds.includes(classe.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cette classe' })
      }
    }

    await req.prisma.classe.delete({
      where: { id: req.params.id }
    })
    res.json({ message: 'Classe supprimée avec succès (élèves et données associées supprimés)' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classe non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
