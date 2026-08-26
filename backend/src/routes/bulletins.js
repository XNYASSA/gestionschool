import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import { checkEcoleAccess } from '../middleware/checkEcoleAccess.js'

const router = express.Router()

// GET BULLETINS BY ELEVE
router.get('/eleve/:eleveId', verifyToken, async (req, res) => {
  try {
    const bulletins = await req.prisma.bulletin.findMany({
      where: { eleveId: req.params.eleveId },
      orderBy: { anneeScolaire: 'desc' }
    })

    res.json(bulletins)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET BULLETIN BY ID
router.get('/:bulletinId', verifyToken, async (req, res) => {
  try {
    const bulletin = await req.prisma.bulletin.findUnique({
      where: { id: req.params.bulletinId },
      include: {
        eleve: {
          include: { classe: { include: { ecole: true } } }
        }
      }
    })

    if (!bulletin) {
      return res.status(404).json({ error: 'Bulletin non trouvé' })
    }

    res.json(bulletin)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE BULLETIN (Principal/Directrice + Super Admin)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { eleveId, trimestre, anneeScolaire } = req.body

    if (!eleveId || !trimestre || !anneeScolaire) {
      return res.status(400).json({ error: 'eleveId, trimestre et anneeScolaire requis' })
    }

    // Récupérer l'élève et sa classe
    const eleve = await req.prisma.eleve.findUnique({
      where: { id: eleveId },
      include: { classe: { include: { ecole: true } } }
    })

    if (!eleve) {
      return res.status(404).json({ error: 'Élève non trouvé' })
    }

    // Vérifier que l'utilisateur a accès à l'école de l'élève
    if (req.user.role !== 'SUPER_ADMIN') {
      const access = await req.prisma.utilisateurEcole.findFirst({
        where: {
          utilisateurId: req.user.id,
          ecoleId: eleve.classe.ecoleId
        }
      })

      if (!access || (access.role !== 'PRINCIPAL' && access.role !== 'DIRECTRICE')) {
        return res.status(403).json({ error: 'Permissions insuffisantes' })
      }
    }

    // Récupérer les notes de l'élève pour le trimestre
    const notes = await req.prisma.note.findMany({
      where: {
        eleveId: eleveId,
        trimestre: parseInt(trimestre),
        statutValidation: 'VALIDE'
      },
      include: {
        enseignantClasseMatiere: {
          include: { matiere: true }
        }
      }
    })

    // Calculer la moyenne générale
    const moyenneGenerale = notes.length > 0
      ? (notes.reduce((sum, n) => sum + n.valeur, 0) / notes.length).toFixed(2)
      : 0

    // Créer le bulletin
    const bulletin = await req.prisma.bulletin.create({
      data: {
        eleveId,
        trimestre: parseInt(trimestre),
        anneeScolaire,
        dateGeneration: new Date()
      }
    })

    res.status(201).json({
      bulletin,
      notes,
      moyenneGenerale,
      eleve: {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        classe: eleve.classe.nom,
        ecole: eleve.classe.ecole.nomComplet
      }
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET BULLETIN DATA FOR PDF GENERATION
router.get('/:bulletinId/data', verifyToken, async (req, res) => {
  try {
    const bulletin = await req.prisma.bulletin.findUnique({
      where: { id: req.params.bulletinId },
      include: {
        eleve: {
          include: {
            classe: {
              include: { ecole: true }
            }
          }
        }
      }
    })

    if (!bulletin) {
      return res.status(404).json({ error: 'Bulletin non trouvé' })
    }

    // Récupérer les notes
    const notes = await req.prisma.note.findMany({
      where: {
        eleveId: bulletin.eleveId,
        trimestre: bulletin.trimestre,
        statutValidation: 'VALIDE'
      },
      include: {
        enseignantClasseMatiere: {
          include: { matiere: true }
        }
      }
    })

    // Calculer les statistiques
    const moyenneGenerale = notes.length > 0
      ? (notes.reduce((sum, n) => sum + n.valeur, 0) / notes.length).toFixed(2)
      : 0

    const appreciation = moyenneGenerale >= 18 ? '⭐ Très Bien'
      : moyenneGenerale >= 15 ? '✅ Bien'
      : moyenneGenerale >= 13 ? '👍 Assez Bien'
      : moyenneGenerale >= 10 ? '📚 Passable'
      : '⚠️ Insuffisant'

    res.json({
      bulletin,
      eleve: {
        nom: bulletin.eleve.nom,
        prenom: bulletin.eleve.prenom,
        matricule: bulletin.eleve.matricule,
        classe: bulletin.eleve.classe.nom,
        ecole: bulletin.eleve.classe.ecole.nomComplet
      },
      notes: notes.map(n => ({
        matiere: n.enseignantClasseMatiere.matiere.nom,
        note: n.valeur,
        coefficient: n.enseignantClasseMatiere.matiere.coefficient,
        observation: n.observation
      })),
      moyenneGenerale,
      appreciation,
      trimestre: bulletin.trimestre,
      anneeScolaire: bulletin.anneeScolaire
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
