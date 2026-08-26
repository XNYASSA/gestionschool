import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET ALL ELEVES (Directeur, Proprietaire, Secretaire)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ECONOMAT']), async (req, res) => {
  try {
    const eleves = await req.prisma.eleve.findMany({
      include: { classe: { include: { ecole: true } } }
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
      include: { classe: { include: { ecole: true } } }
    })
    if (!eleve) return res.status(404).json({ error: 'Élève non trouvé' })
    res.json(eleve)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE ELEVE (Super Admin, Principal/Directrice, Secretaire)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    let { matricule, nom, prenom, sexe, dateNaissance, classeId, nomParent, lieuParente, telephoneParent, emailParent, adresseParent } = req.body

    // Valider les champs requis
    if (!nom || !prenom || !sexe || !dateNaissance || !classeId || !nomParent || !telephoneParent) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' })
    }

    // Si matricule vide, générer un matricule unique
    if (!matricule || matricule.trim() === '') {
      let maxNum = 0
      const allEleves = await req.prisma.eleve.findMany({ select: { matricule: true } })

      // Extraire les numéros des matricules existants (ex: "MAT001" → 1)
      allEleves.forEach(e => {
        const match = e.matricule.match(/\d+/)
        if (match) {
          const num = parseInt(match[0])
          if (num > maxNum) maxNum = num
        }
      })

      // Générer le prochain matricule unique
      matricule = `MAT${String(maxNum + 1).padStart(3, '0')}`
    } else {
      // Si matricule fourni, vérifier qu'il n'existe pas
      const existing = await req.prisma.eleve.findUnique({
        where: { matricule }
      })

      if (existing) {
        return res.status(400).json({ error: `Matricule ${matricule} déjà utilisé` })
      }
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

// UPDATE ELEVE (Super Admin, Principal/Directrice, Secretaire)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { nom, prenom, sexe, dateNaissance, classeId, nomParent, lieuParente, telephoneParent, emailParent, adresseParent } = req.body

    const eleve = await req.prisma.eleve.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(prenom && { prenom }),
        ...(sexe && { sexe }),
        ...(dateNaissance && { dateNaissance: new Date(dateNaissance) }),
        ...(classeId && { classeId }),
        ...(nomParent && { nomParent }),
        ...(lieuParente !== undefined && { lieuParente }),
        ...(telephoneParent && { telephoneParent }),
        ...(emailParent !== undefined && { emailParent }),
        ...(adresseParent !== undefined && { adresseParent })
      },
      include: { classe: { include: { ecole: true } } }
    })
    res.json(eleve)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Élève non trouvé' })
    }
    res.status(400).json({ error: error.message })
  }
})

// DELETE ELEVE (Proprietaire only)
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    // Supprimer les frais liés
    await req.prisma.inscriptionFrais.deleteMany({
      where: { eleveId: req.params.id }
    })

    // Supprimer les notes
    await req.prisma.note.deleteMany({
      where: { eleveId: req.params.id }
    })

    // Supprimer les présences
    await req.prisma.presence.deleteMany({
      where: { eleveId: req.params.id }
    })

    // Supprimer l'élève
    await req.prisma.eleve.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Élève supprimé avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Élève non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
