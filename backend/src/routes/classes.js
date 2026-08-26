import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL CLASSES
router.get('/', verifyToken, async (req, res) => {
  try {
    const classes = await req.prisma.classe.findMany({
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

// DELETE CLASSE (Super Admin only) - CASCADE deletes students and their data
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
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
