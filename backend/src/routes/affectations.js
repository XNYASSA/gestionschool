import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET AFFECTATIONS ENSEIGNANT/CLASSE/MATIÈRE D'UNE ÉCOLE
router.get('/', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { ecoleId } = req.query
    if (!ecoleId) {
      return res.status(400).json({ error: 'ecoleId requis' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const affectations = await req.prisma.enseignantClasseMatiere.findMany({
      where: { classe: { ecoleId } },
      include: {
        enseignant: { include: { utilisateur: { select: { id: true, nom: true } } } },
        classe: { select: { id: true, nom: true } },
        matiere: { select: { id: true, nom: true } }
      },
      orderBy: [{ classeId: 'asc' }]
    })

    res.json(affectations.map(a => ({
      id: a.id,
      enseignantUtilisateurId: a.enseignant.utilisateur.id,
      enseignantNom: a.enseignant.utilisateur.nom,
      classeId: a.classe.id,
      classeNom: a.classe.nom,
      matiereId: a.matiere.id,
      matiereNom: a.matiere.nom,
      nombreLeconsPrevues: a.nombreLeconsPrevues
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE AFFECTATION (Principal/Directrice, Super Admin) — crée le profil Enseignant au besoin
router.post('/', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { utilisateurId, classeId, matiereId } = req.body

    if (!utilisateurId || !classeId || !matiereId) {
      return res.status(400).json({ error: 'Champs obligatoires: utilisateurId, classeId, matiereId' })
    }

    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { enseignant: true }
    })
    if (!utilisateur || utilisateur.role !== 'ENSEIGNANT') {
      return res.status(400).json({ error: "Cet utilisateur n'est pas un enseignant" })
    }

    const classe = await req.prisma.classe.findUnique({ where: { id: classeId } })
    if (!classe) {
      return res.status(404).json({ error: 'Classe non trouvée' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(classe.ecoleId)) {
      return res.status(403).json({ error: 'Cette classe n\'appartient pas à une école qui vous est affectée' })
    }

    const matiere = await req.prisma.matiere.findUnique({ where: { id: matiereId } })
    if (!matiere || matiere.ecoleId !== classe.ecoleId) {
      return res.status(400).json({ error: "Cette matière n'appartient pas à l'école de la classe" })
    }

    const enseignant = utilisateur.enseignant
      || await req.prisma.enseignant.create({ data: { utilisateurId: utilisateur.id, telephone: utilisateur.telephone || '' } })

    const existante = await req.prisma.enseignantClasseMatiere.findFirst({
      where: { enseignantId: enseignant.id, classeId, matiereId }
    })
    if (existante) {
      return res.status(400).json({ error: 'Cette affectation existe déjà' })
    }

    const affectation = await req.prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignant.id, classeId, matiereId }
    })

    res.status(201).json(affectation)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE AFFECTATION
router.delete('/:id', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const affectation = await req.prisma.enseignantClasseMatiere.findUnique({
      where: { id: req.params.id },
      include: { classe: true }
    })
    if (!affectation) {
      return res.status(404).json({ error: 'Affectation non trouvée' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(affectation.classe.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette affectation' })
    }

    await req.prisma.enseignantClasseMatiere.delete({ where: { id: req.params.id } })
    res.json({ message: 'Affectation supprimée' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
