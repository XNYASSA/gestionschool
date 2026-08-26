import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import { checkEcoleAccess } from '../middleware/checkEcoleAccess.js'

const router = express.Router()

const rolesAutorises = ['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ECONOMAT']

// CREATE SAISIE QUOTIDIENNE
router.post('/:ecoleId', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    const { date, type, donnees } = req.body

    // Vérifier que l'utilisateur est l'un des rôles autorisés
    if (!rolesAutorises.includes(req.ecoleRole) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Rôle non autorisé pour saisie quotidienne' })
    }

    if (!date || !type || !donnees) {
      return res.status(400).json({ error: 'date, type et donnees requis' })
    }

    const saisie = await req.prisma.saisieQuotidienne.create({
      data: {
        date: new Date(date),
        utilisateurId: req.user.id,
        ecoleId: req.params.ecoleId,
        role: req.ecoleRole,
        type,
        donnees: JSON.stringify(donnees),
        validee: false
      }
    })

    res.status(201).json({
      ...saisie,
      donnees: JSON.parse(saisie.donnees)
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET SAISIES BY ECOLE & DATE
router.get('/:ecoleId', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    const { date, type } = req.query

    const filters = { ecoleId: req.params.ecoleId }
    if (date) {
      const dateObj = new Date(date)
      filters.date = {
        gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
      }
    }
    if (type) {
      filters.type = type
    }

    const saisies = await req.prisma.saisieQuotidienne.findMany({
      where: filters,
      include: { utilisateur: true },
      orderBy: { date: 'desc' }
    })

    res.json(saisies.map(s => ({
      ...s,
      donnees: JSON.parse(s.donnees)
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// VALIDATE SAISIE
router.patch('/:saisieId/valider', verifyToken, async (req, res) => {
  try {
    const saisie = await req.prisma.saisieQuotidienne.findUnique({
      where: { id: req.params.saisieId },
      include: { ecole: true }
    })

    if (!saisie) {
      return res.status(404).json({ error: 'Saisie non trouvée' })
    }

    // Vérifier que l'utilisateur a accès à cette école
    const access = await req.prisma.utilisateurEcole.findFirst({
      where: {
        utilisateurId: req.user.id,
        ecoleId: saisie.ecoleId,
        actif: true
      }
    })

    if (!access && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const saisieValidee = await req.prisma.saisieQuotidienne.update({
      where: { id: req.params.saisieId },
      data: { validee: true }
    })

    res.json({
      ...saisieValidee,
      donnees: JSON.parse(saisieValidee.donnees)
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// DELETE SAISIE
router.delete('/:saisieId', verifyToken, async (req, res) => {
  try {
    const saisie = await req.prisma.saisieQuotidienne.findUnique({
      where: { id: req.params.saisieId }
    })

    if (!saisie) {
      return res.status(404).json({ error: 'Saisie non trouvée' })
    }

    // Vérifier que c'est l'utilisateur qui a créé ou SUPER_ADMIN
    if (saisie.utilisateurId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    await req.prisma.saisieQuotidienne.delete({
      where: { id: req.params.saisieId }
    })

    res.json({ message: 'Saisie supprimée' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
