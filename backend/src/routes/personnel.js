import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL PERSONNEL
router.get('/', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const personnel = await req.prisma.personnel.findMany({
      orderBy: { dateEmbauche: 'desc' }
    })
    res.json(personnel)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET PERSONNEL BY ID
router.get('/:id', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const personnel = await req.prisma.personnel.findUnique({
      where: { id: req.params.id }
    })
    if (!personnel) {
      return res.status(404).json({ error: 'Personnel non trouvé' })
    }
    res.json(personnel)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE PERSONNEL (Admin ou Directeur)
router.post('/', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const { nom, fonction, telephone, salaireMensuel, dateEmbauche } = req.body

    if (!nom || !fonction || !telephone || !salaireMensuel) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' })
    }

    // Récupérer l'école (on suppose une seule école pour maintenant)
    const ecole = await req.prisma.ecole.findFirst()

    const personnel = await req.prisma.personnel.create({
      data: {
        ecoleId: ecole.id,
        nom,
        fonction,
        telephone,
        salaireMensuel,
        dateEmbauche: dateEmbauche ? new Date(dateEmbauche) : new Date(),
        actif: true
      }
    })

    res.status(201).json(personnel)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// UPDATE PERSONNEL (Admin ou Directeur)
router.put('/:id', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const { nom, fonction, telephone, salaireMensuel } = req.body

    const personnel = await req.prisma.personnel.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(fonction && { fonction }),
        ...(telephone && { telephone }),
        ...(salaireMensuel && { salaireMensuel })
      }
    })

    res.json(personnel)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// TOGGLE ACTIF/INACTIF (Admin ou Directeur)
router.put('/:id/toggle-statut', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR']), async (req, res) => {
  try {
    const personnel = await req.prisma.personnel.findUnique({
      where: { id: req.params.id }
    })

    if (!personnel) {
      return res.status(404).json({ error: 'Personnel non trouvé' })
    }

    const updated = await req.prisma.personnel.update({
      where: { id: req.params.id },
      data: { actif: !personnel.actif }
    })

    res.json({
      ...updated,
      message: `Personnel ${updated.actif ? 'activé' : 'désactivé'} avec succès`
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// DELETE PERSONNEL (Admin uniquement)
router.delete('/:id', verifyToken, checkRole(['PROPRIETAIRE']), async (req, res) => {
  try {
    const personnel = await req.prisma.personnel.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Personnel supprimé avec succès',
      deleted: personnel
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
