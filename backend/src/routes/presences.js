import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET PRESENCES
router.get('/', verifyToken, async (req, res) => {
  try {
    const presences = await req.prisma.presence.findMany({
      include: { eleve: true, classe: true }
    })
    res.json(presences)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ENREGISTRER PRESENCE (Enseignant)
router.post('/', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const { eleveId, classeId, date, statut } = req.body

    const presence = await req.prisma.presence.upsert({
      where: {
        eleveId_date: {
          eleveId,
          date: new Date(date)
        }
      },
      update: { statut },
      create: {
        eleveId,
        classeId,
        date: new Date(date),
        statut
      }
    })

    res.json(presence)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
