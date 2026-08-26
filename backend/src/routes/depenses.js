import express from 'express'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET - Lister toutes les dépenses
router.get('/', verifyToken, async (req, res) => {
  try {
    const depenses = await req.prisma.depense.findMany({
      include: { ecole: true },
      orderBy: { dateDepense: 'desc' }
    })
    res.json(depenses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Dépenses par catégorie
router.get('/categorie/:categorie', verifyToken, async (req, res) => {
  try {
    const depenses = await req.prisma.depense.findMany({
      where: { categorie: req.params.categorie },
      orderBy: { dateDepense: 'desc' }
    })
    res.json(depenses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Créer une dépense
router.post('/', verifyToken, async (req, res) => {
  try {
    const { description, categorie, type, montant, dateDepense, ecoleId } = req.body

    if (!description || !categorie || !montant) {
      return res.status(400).json({ error: 'Champs obligatoires: description, categorie, montant' })
    }

    const depense = await req.prisma.depense.create({
      data: {
        description,
        categorie,
        type: type === 'FIXE' ? 'FIXE' : 'VARIABLE',
        montant: parseInt(montant),
        dateDepense: dateDepense ? new Date(dateDepense) : new Date(),
        ecoleId: ecoleId || null
      }
    })

    res.status(201).json(depense)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Modifier une dépense
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { description, categorie, type, montant, dateDepense, ecoleId } = req.body

    const depense = await req.prisma.depense.update({
      where: { id: req.params.id },
      data: {
        ...(description && { description }),
        ...(categorie && { categorie }),
        ...(type && { type: type === 'FIXE' ? 'FIXE' : 'VARIABLE' }),
        ...(montant && { montant: parseInt(montant) }),
        ...(dateDepense && { dateDepense: new Date(dateDepense) }),
        ...(ecoleId !== undefined && { ecoleId: ecoleId || null })
      }
    })

    res.json(depense)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE - Supprimer une dépense
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await req.prisma.depense.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Dépense supprimée' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Statistiques des dépenses
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const depenses = await req.prisma.depense.findMany()
    const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0)

    const parCategorie = {}
    depenses.forEach(d => {
      if (!parCategorie[d.categorie]) {
        parCategorie[d.categorie] = 0
      }
      parCategorie[d.categorie] += d.montant
    })

    res.json({
      totalDepenses,
      parCategorie,
      nombreDepenses: depenses.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
