import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL CLASSES
router.get('/', verifyToken, async (req, res) => {
  try {
    const classes = await req.prisma.classe.findMany({
      orderBy: [{ section: 'asc' }, { nom: 'asc' }],
      include: { sectionRel: true }
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
      include: { eleves: true, enseignantClasseMatieres: true, sectionRel: true }
    })
    if (!classe) return res.status(404).json({ error: 'Classe non trouvée' })
    res.json(classe)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE CLASSE (Admin only)
router.post('/', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const { nom, section, sectionId, niveau } = req.body

    if (!nom || !section || !niveau) {
      return res.status(400).json({ error: 'Les champs nom, section et niveau sont obligatoires' })
    }

    const classe = await req.prisma.classe.create({
      data: {
        nom,
        section,
        sectionId: sectionId || section,
        niveau
      },
      include: { sectionRel: true }
    })
    res.status(201).json(classe)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE CLASSE (Admin only)
router.put('/:id', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const { nom, section, sectionId, niveau } = req.body

    const classe = await req.prisma.classe.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(section && { section }),
        ...(sectionId && { sectionId }),
        ...(niveau && { niveau })
      },
      include: { sectionRel: true }
    })
    res.json(classe)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classe non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE CLASSE (Admin only)
router.delete('/:id', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    // Check if classe has students
    const elevesCount = await req.prisma.eleve.count({
      where: { classeId: req.params.id }
    })

    if (elevesCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer: ${elevesCount} élève(s) utilisent cette classe`
      })
    }

    await req.prisma.classe.delete({
      where: { id: req.params.id }
    })
    res.json({ message: 'Classe supprimée avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classe non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
