import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { checkEcoleAccess } from '../middleware/checkEcoleAccess.js'

const router = express.Router()

// GET ALL ECOLES (accès selon rôle)
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'SUPER_ADMIN') {
      const ecoles = await req.prisma.ecole.findMany({
        orderBy: { nomCourt: 'asc' }
      })
      return res.json(ecoles)
    }

    // Autres rôles : voir uniquement leurs écoles assignées
    const utilisateurEcoles = await req.prisma.utilisateurEcole.findMany({
      where: { utilisateurId: req.user.id, actif: true },
      include: { ecole: true }
    })

    res.json(utilisateurEcoles.map(ue => ue.ecole))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET ECOLE BY ID
router.get('/:ecoleId', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    const ecole = await req.prisma.ecole.findUnique({
      where: { id: req.params.ecoleId },
      include: {
        classes: {
          orderBy: { nom: 'asc' },
          include: {
            eleves: { orderBy: { prenom: 'asc' } }
          }
        },
        matieres: { orderBy: { nom: 'asc' } },
        personnel: { orderBy: { nom: 'asc' } },
        configurationsFrais: true
      }
    })

    if (!ecole) {
      return res.status(404).json({ error: 'École non trouvée' })
    }

    // Aplatir les élèves pour faciliter l'accès au frontend
    const eleves = ecole.classes.flatMap(c =>
      c.eleves.map(e => ({ ...e, classe: { id: c.id, nom: c.nom } }))
    )

    res.json({ ...ecole, eleves })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE ECOLE (Super Admin only)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nomCourt, nomComplet, niveau, adresse, telephone, email } = req.body

    if (!nomCourt || !nomComplet || !niveau) {
      return res.status(400).json({ error: 'Champs requis manquants' })
    }

    const ecole = await req.prisma.ecole.create({
      data: {
        nomCourt,
        nomComplet,
        niveau,
        adresse: adresse || 'Yaoundé, Cameroun',
        telephone: telephone || '+237 6 XX XXX XXXX',
        email: email || `info@${nomCourt.toLowerCase()}.cm`
      }
    })

    res.status(201).json(ecole)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// UPDATE ECOLE (Super Admin + Principal/Directrice de cette école)
router.put('/:ecoleId', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    const { nomCourt, nomComplet, niveau, adresse, telephone, email, actif } = req.body

    // Vérifier que seul SUPER_ADMIN ou le gestionnaire de l'école peut modifier
    if (req.user.role !== 'SUPER_ADMIN' && req.ecoleRole !== 'PRINCIPAL' && req.ecoleRole !== 'DIRECTRICE') {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const ecole = await req.prisma.ecole.update({
      where: { id: req.params.ecoleId },
      data: {
        ...(nomCourt && { nomCourt }),
        ...(nomComplet && { nomComplet }),
        ...(niveau && { niveau }),
        ...(adresse && { adresse }),
        ...(telephone && { telephone }),
        ...(email && { email }),
        ...(actif !== undefined && { actif })
      }
    })

    res.json(ecole)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// DELETE ECOLE (Super Admin only)
router.delete('/:ecoleId', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await req.prisma.ecole.delete({
      where: { id: req.params.ecoleId }
    })

    res.json({ message: 'École supprimée avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'École non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// GET ELEVES BY ECOLE
router.get('/:ecoleId/eleves', verifyToken, checkEcoleAccess, async (req, res) => {
  try {
    // Récupérer toutes les classes de l'école et leurs élèves
    const classes = await req.prisma.classe.findMany({
      where: { ecoleId: req.params.ecoleId },
      include: {
        eleves: {
          orderBy: { prenom: 'asc' }
        }
      }
    })

    // Aplatir les élèves et ajouter infos classe
    const eleves = classes.flatMap(classe =>
      classe.eleves.map(eleve => ({
        ...eleve,
        classe: { id: classe.id, nom: classe.nom },
        ecoleId: req.params.ecoleId
      }))
    )

    res.json(eleves)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
