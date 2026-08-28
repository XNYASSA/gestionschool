import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL MATIERES
router.get('/', verifyToken, async (req, res) => {
  try {
    const matieres = await req.prisma.matiere.findMany({
      include: { ecole: { select: { id: true, nomCourt: true } } },
      orderBy: [{ ecoleId: 'asc' }, { nom: 'asc' }]
    })
    res.json(matieres)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET MATIERES BY ÉCOLE (coefficients propres à cette école, collège ou primaire)
router.get('/ecole/:ecoleId', verifyToken, async (req, res) => {
  try {
    const matieres = await req.prisma.matiere.findMany({
      where: { ecoleId: req.params.ecoleId },
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
    const { nom, ecoleId, coefficient } = req.body

    if (!nom || !ecoleId) {
      return res.status(400).json({ error: 'Les champs nom et ecoleId sont obligatoires' })
    }

    const matiere = await req.prisma.matiere.create({
      data: {
        nom,
        ecoleId,
        coefficient: coefficient || 3
      },
      include: { ecole: { select: { id: true, nomCourt: true } } }
    })
    res.status(201).json(matiere)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE MATIERE (Admin, Principal, Directrice - notamment pour ajuster les coefficients ;
// un Enseignant peut aussi ajuster le coefficient d'une matière qu'il enseigne, pas son nom)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'ENSEIGNANT']), async (req, res) => {
  try {
    const { nom, coefficient } = req.body

    if (req.user.role === 'ENSEIGNANT') {
      if (nom !== undefined) {
        return res.status(403).json({ error: 'Vous ne pouvez modifier que le coefficient' })
      }
      const enseignant = await req.prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } })
      const ecm = enseignant && await req.prisma.enseignantClasseMatiere.findFirst({
        where: { enseignantId: enseignant.id, matiereId: req.params.id }
      })
      if (!ecm) {
        return res.status(403).json({ error: "Vous n'enseignez pas cette matière" })
      }
    }

    const matiere = await req.prisma.matiere.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(coefficient !== undefined && { coefficient })
      },
      include: { ecole: { select: { id: true, nomCourt: true } } }
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
