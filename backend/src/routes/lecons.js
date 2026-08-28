import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET PROGRESSION DES PROGRAMMES (par école / classe / enseignant) - Admin, Principal, Directrice
router.get('/progression', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const ecms = await req.prisma.enseignantClasseMatiere.findMany({
      where: ecoleIds ? { classe: { ecoleId: { in: ecoleIds } } } : {},
      include: {
        enseignant: { include: { utilisateur: { select: { nom: true } } } },
        classe: { include: { ecole: { select: { id: true, nomCourt: true, nomComplet: true } } } },
        matiere: { select: { nom: true } },
        _count: { select: { lecons: true } }
      },
      orderBy: [{ classeId: 'asc' }]
    })

    const progression = ecms.map(ecm => {
      const faites = ecm._count.lecons
      const prevues = ecm.nombreLeconsPrevues
      const pourcentage = prevues > 0 ? Math.min(100, Math.round((faites / prevues) * 100)) : 0

      return {
        ecmId: ecm.id,
        enseignantId: ecm.enseignantId,
        enseignantNom: ecm.enseignant.utilisateur.nom,
        classeId: ecm.classeId,
        classeNom: ecm.classe.nom,
        ecoleId: ecm.classe.ecole.id,
        ecoleNom: ecm.classe.ecole.nomCourt,
        matiereNom: ecm.matiere.nom,
        nombreLeconsPrevues: prevues,
        nombreLeconsFaites: faites,
        nombreLeconsRestantes: Math.max(0, prevues - faites),
        pourcentage
      }
    })

    res.json(progression)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET MES AFFECTATIONS (Enseignant) - classes/matières + progression pour la saisie du cahier de textes
router.get('/mes-ecm', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const enseignant = await req.prisma.enseignant.findUnique({
      where: { utilisateurId: req.user.id }
    })

    if (!enseignant) {
      return res.json([])
    }

    const ecms = await req.prisma.enseignantClasseMatiere.findMany({
      where: { enseignantId: enseignant.id },
      include: {
        classe: { include: { ecole: { select: { id: true, nomCourt: true } } } },
        matiere: { select: { id: true, nom: true, coefficient: true } },
        _count: { select: { lecons: true } }
      }
    })

    res.json(ecms.map(ecm => {
      const faites = ecm._count.lecons
      const prevues = ecm.nombreLeconsPrevues
      return {
        ecmId: ecm.id,
        classeId: ecm.classeId,
        classeNom: ecm.classe.nom,
        ecoleId: ecm.classe.ecole.id,
        ecoleNom: ecm.classe.ecole.nomCourt,
        matiereId: ecm.matiere.id,
        matiereNom: ecm.matiere.nom,
        coefficient: ecm.matiere.coefficient,
        nombreLeconsPrevues: prevues,
        nombreLeconsFaites: faites,
        nombreLeconsRestantes: Math.max(0, prevues - faites),
        pourcentage: prevues > 0 ? Math.min(100, Math.round((faites / prevues) * 100)) : 0
      }
    }))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET LEÇONS SAISIES POUR UNE AFFECTATION (historique)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { ecmId } = req.query
    if (!ecmId) {
      return res.status(400).json({ error: 'ecmId requis' })
    }

    if (req.user.role === 'ENSEIGNANT') {
      const ecm = await req.prisma.enseignantClasseMatiere.findUnique({
        where: { id: ecmId },
        include: { enseignant: true }
      })
      if (!ecm || ecm.enseignant.utilisateurId !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé à cette affectation' })
      }
    }

    const lecons = await req.prisma.lecon.findMany({
      where: { ecmId },
      orderBy: { date: 'desc' }
    })
    res.json(lecons)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Saisir une leçon faite (Enseignant, sur ses propres affectations)
router.post('/', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const { ecmId, date, titre, contenu } = req.body

    if (!ecmId || !date || !titre) {
      return res.status(400).json({ error: 'Champs obligatoires: ecmId, date, titre' })
    }

    const ecm = await req.prisma.enseignantClasseMatiere.findUnique({
      where: { id: ecmId },
      include: { enseignant: true }
    })

    if (!ecm || ecm.enseignant.utilisateurId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé à cette affectation' })
    }

    const lecon = await req.prisma.lecon.create({
      data: { ecmId, date: new Date(date), titre, contenu: contenu || null }
    })

    res.status(201).json(lecon)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Définir/modifier le nombre de leçons prévues pour une affectation (Enseignant sur ses classes, ou Admin)
router.put('/ecm/:ecmId/objectif', verifyToken, checkRole(['ENSEIGNANT', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { nombreLeconsPrevues } = req.body
    const valeur = parseInt(nombreLeconsPrevues)

    if (isNaN(valeur) || valeur < 0) {
      return res.status(400).json({ error: 'nombreLeconsPrevues doit être un entier positif' })
    }

    const ecm = await req.prisma.enseignantClasseMatiere.findUnique({
      where: { id: req.params.ecmId },
      include: { enseignant: true }
    })

    if (!ecm) {
      return res.status(404).json({ error: 'Affectation non trouvée' })
    }

    if (req.user.role === 'ENSEIGNANT' && ecm.enseignant.utilisateurId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé à cette affectation' })
    }

    const updated = await req.prisma.enseignantClasseMatiere.update({
      where: { id: req.params.ecmId },
      data: { nombreLeconsPrevues: valeur }
    })

    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
