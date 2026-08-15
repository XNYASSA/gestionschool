import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL ELEVES (Directeur, Proprietaire, Secretaire)
router.get('/', verifyToken, checkRole(['PROPRIETAIRE', 'DIRECTEUR', 'SECRETAIRE']), async (req, res) => {
  try {
    const eleves = await req.prisma.eleve.findMany({
      include: { classe: true }
    })
    res.json(eleves)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET ELEVE BY ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const eleve = await req.prisma.eleve.findUnique({
      where: { id: req.params.id },
      include: { classe: true }
    })
    if (!eleve) return res.status(404).json({ error: 'Élève non trouvé' })
    res.json(eleve)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE ELEVE (Secretaire uniquement)
router.post('/', verifyToken, checkRole(['SECRETAIRE']), async (req, res) => {
  try {
    const { matricule, nom, prenom, sexe, dateNaissance, classeId, nomParent, lieuParente, telephoneParent, emailParent, adresseParent } = req.body

    // Valider les champs requis
    if (!matricule || !nom || !prenom || !sexe || !dateNaissance || !classeId || !nomParent || !telephoneParent) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' })
    }

    const eleve = await req.prisma.eleve.create({
      data: {
        matricule,
        nom,
        prenom,
        sexe,
        dateNaissance: new Date(dateNaissance),
        classeId,
        nomParent,
        lieuParente,
        telephoneParent,
        emailParent,
        adresseParent
      },
      include: { classe: true }
    })

    res.status(201).json(eleve)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// UPDATE ELEVE (Secretaire)
router.put('/:id', verifyToken, checkRole(['SECRETAIRE']), async (req, res) => {
  try {
    const eleve = await req.prisma.eleve.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(eleve)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
