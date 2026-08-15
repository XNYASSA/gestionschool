import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET NOTES (selon le rôle)
router.get('/', verifyToken, async (req, res) => {
  try {
    let notes

    if (req.user.role === 'ENSEIGNANT') {
      // Enseignant voit uniquement ses notes
      const enseignant = await req.prisma.enseignant.findUnique({
        where: { utilisateurId: req.user.id },
        include: { classesMatières: true }
      })

      const ecmIds = enseignant?.classesMatières.map(ecm => ecm.id) || []

      notes = await req.prisma.note.findMany({
        where: { ecmId: { in: ecmIds } },
        include: { eleve: true, enseignantClasseMatiere: true }
      })
    } else {
      // Autres rôles voient tout
      notes = await req.prisma.note.findMany({
        include: { eleve: true, enseignantClasseMatiere: true }
      })
    }

    res.json(notes)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE/UPDATE NOTE (Enseignant)
router.post('/', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const { eleveId, ecmId, trimestre, valeur } = req.body

    const note = await req.prisma.note.create({
      data: {
        eleveId,
        ecmId,
        trimestre,
        valeur
      }
    })

    res.status(201).json(note)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// VALIDER NOTE (Directeur)
router.put('/:id/valider', verifyToken, checkRole(['DIRECTEUR']), async (req, res) => {
  try {
    const note = await req.prisma.note.update({
      where: { id: req.params.id },
      data: { statutValidation: 'VALIDÉ' }
    })
    res.json(note)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
