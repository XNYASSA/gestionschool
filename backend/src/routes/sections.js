import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL SECTIONS
router.get('/', verifyToken, async (req, res) => {
  try {
    const sections = await req.prisma.section.findMany({
      orderBy: { ordre: 'asc' },
      include: { classes: true }
    })
    res.json(sections)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET SECTION BY ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const section = await req.prisma.section.findUnique({
      where: { id: req.params.id },
      include: { classes: true }
    })
    if (!section) return res.status(404).json({ error: 'Section non trouvée' })
    res.json(section)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE SECTION (Admin only)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, emoji, ordre } = req.body

    if (!nom) return res.status(400).json({ error: 'Le nom est obligatoire' })

    const section = await req.prisma.section.create({
      data: {
        nom,
        emoji: emoji || '📚',
        ordre: ordre || 0
      }
    })
    res.status(201).json(section)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE SECTION (Admin only)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, emoji, ordre, actif } = req.body

    const section = await req.prisma.section.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(emoji && { emoji }),
        ...(ordre !== undefined && { ordre }),
        ...(actif !== undefined && { actif })
      }
    })
    res.json(section)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Section non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE SECTION (Admin only) - CASCADE deletes classes and their data
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await req.prisma.section.delete({
      where: { id: req.params.id }
    })
    res.json({ message: 'Section supprimée avec succès (classes associées supprimées)' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Section non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
