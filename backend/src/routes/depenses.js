import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET - Lister les dépenses (Super Admin : toutes ; Principal/Directrice : de leur(s) école(s) uniquement)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const depenses = await req.prisma.depense.findMany({
      where: ecoleIds ? { ecoleId: { in: ecoleIds } } : {},
      include: { ecole: true },
      orderBy: { dateDepense: 'desc' }
    })
    res.json(depenses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Dépenses par catégorie
router.get('/categorie/:categorie', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const depenses = await req.prisma.depense.findMany({
      where: {
        categorie: req.params.categorie,
        ...(ecoleIds ? { ecoleId: { in: ecoleIds } } : {})
      },
      orderBy: { dateDepense: 'desc' }
    })
    res.json(depenses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Créer une dépense (Principal/Directrice : uniquement pour une école qui leur est affectée)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { description, categorie, type, montant, dateDepense, ecoleId } = req.body

    if (!description || !categorie || !montant) {
      return res.status(400).json({ error: 'Champs obligatoires: description, categorie, montant' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      if (!ecoleId || !ecoleIds.includes(ecoleId)) {
        return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
      }
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

// PUT - Modifier une dépense (limité à celles de son école pour Principal/Directrice)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { description, categorie, type, montant, dateDepense, ecoleId } = req.body

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const depenseActuelle = await req.prisma.depense.findUnique({ where: { id: req.params.id } })
      if (!depenseActuelle || !ecoleIds.includes(depenseActuelle.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cette dépense' })
      }
      if (ecoleId && !ecoleIds.includes(ecoleId)) {
        return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
      }
    }

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

// DELETE - Supprimer une dépense (limité à celles de son école pour Principal/Directrice)
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const depenseActuelle = await req.prisma.depense.findUnique({ where: { id: req.params.id } })
      if (!depenseActuelle || !ecoleIds.includes(depenseActuelle.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cette dépense' })
      }
    }

    await req.prisma.depense.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Dépense supprimée' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Statistiques des dépenses
router.get('/stats/summary', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    const depenses = await req.prisma.depense.findMany({
      where: ecoleIds ? { ecoleId: { in: ecoleIds } } : {}
    })
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
