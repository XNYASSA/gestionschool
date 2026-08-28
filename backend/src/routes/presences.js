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

// ENREGISTRER PRESENCE (Enseignant, sur une classe qu'il enseigne)
router.post('/', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const { eleveId, classeId, date, statut, observation } = req.body

    if (!eleveId || !classeId || !date || !statut) {
      return res.status(400).json({ error: 'Champs obligatoires: eleveId, classeId, date, statut' })
    }

    const enseignant = await req.prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } })
    const ecm = enseignant && await req.prisma.enseignantClasseMatiere.findFirst({
      where: { enseignantId: enseignant.id, classeId }
    })
    if (!ecm) {
      return res.status(403).json({ error: "Vous n'enseignez pas dans cette classe" })
    }

    const presence = await req.prisma.presence.upsert({
      where: {
        eleveId_date: {
          eleveId,
          date: new Date(date)
        }
      },
      update: { statut, observation: observation || null },
      create: {
        eleveId,
        classeId,
        date: new Date(date),
        statut,
        observation: observation || null
      }
    })

    res.json(presence)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
