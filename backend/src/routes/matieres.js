import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL MATIERES
router.get('/', verifyToken, async (req, res) => {
  try {
    const matieres = await req.prisma.matiere.findMany({
      include: { section: true },
      orderBy: [{ sectionId: 'asc' }, { nom: 'asc' }]
    })
    res.json(matieres)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET MATIERES BY SECTION
router.get('/section/:sectionId', verifyToken, async (req, res) => {
  try {
    const matieres = await req.prisma.matiere.findMany({
      where: { sectionId: req.params.sectionId },
      include: { section: true },
      orderBy: { nom: 'asc' }
    })
    res.json(matieres)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE MATIERE (Admin only)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, sectionId, coefficient } = req.body

    if (!nom || !sectionId) {
      return res.status(400).json({ error: 'Les champs nom et sectionId sont obligatoires' })
    }

    const matiere = await req.prisma.matiere.create({
      data: {
        nom,
        sectionId,
        coefficient: coefficient || 3
      },
      include: { section: true }
    })
    res.status(201).json(matiere)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE MATIERE (Admin only)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, coefficient } = req.body

    const matiere = await req.prisma.matiere.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(coefficient && { coefficient })
      },
      include: { section: true }
    })
    res.json(matiere)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matière non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE MATIERE (Admin only)
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    // Check if matiere is used
    const usageCount = await req.prisma.enseignantClasseMatiere.count({
      where: { matiereId: req.params.id }
    })

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer: ${usageCount} affectation(s) utilisent cette matière`
      })
    }

    await req.prisma.matiere.delete({
      where: { id: req.params.id }
    })
    res.json({ message: 'Matière supprimée avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matière non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
