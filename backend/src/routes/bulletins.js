import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// Moyenne pondérée par les coefficients des matières (propres à chaque école) + appréciation
async function calculerNotesEleve(prisma, eleveId, trimestre) {
  const notes = await prisma.note.findMany({
    where: {
      eleveId,
      trimestre: parseInt(trimestre),
      statutValidation: 'VALIDE'
    },
    include: {
      enseignantClasseMatiere: { include: { matiere: true } }
    }
  })

  const totalCoefficients = notes.reduce((sum, n) => sum + n.enseignantClasseMatiere.matiere.coefficient, 0)
  const totalPoints = notes.reduce((sum, n) => sum + n.valeur * n.enseignantClasseMatiere.matiere.coefficient, 0)
  const moyenneGenerale = totalCoefficients > 0 ? Number((totalPoints / totalCoefficients).toFixed(2)) : 0

  return {
    notes: notes.map(n => ({
      matiere: n.enseignantClasseMatiere.matiere.nom,
      note: n.valeur,
      coefficient: n.enseignantClasseMatiere.matiere.coefficient,
      observation: n.observation
    })),
    moyenneGenerale
  }
}

function appreciation(moyenne) {
  return moyenne >= 18 ? '⭐ Très Bien'
    : moyenne >= 15 ? '✅ Bien'
    : moyenne >= 13 ? '👍 Assez Bien'
    : moyenne >= 10 ? '📚 Passable'
    : '⚠️ Insuffisant'
}

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

// GÉNÉRER LES BULLETINS : un élève, plusieurs élèves choisis, ou tous les élèves d'une classe
// (Principal/Directrice + Super Admin). Les notes et coefficients viennent de l'API en temps réel.
router.post('/generer', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { classeId, eleveIds, trimestre, anneeScolaire } = req.body

    if (!trimestre || !anneeScolaire || (!classeId && !(eleveIds?.length))) {
      return res.status(400).json({ error: 'trimestre, anneeScolaire et (classeId ou eleveIds) sont obligatoires' })
    }

    const eleves = classeId
      ? await req.prisma.eleve.findMany({
          where: { classeId },
          include: { classe: { include: { ecole: true } } },
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
        })
      : await req.prisma.eleve.findMany({
          where: { id: { in: eleveIds } },
          include: { classe: { include: { ecole: true } } }
        })

    if (eleves.length === 0) {
      return res.status(404).json({ error: 'Aucun élève trouvé pour cette sélection' })
    }

    const resultats = await Promise.all(eleves.map(async (eleve) => {
      const { notes, moyenneGenerale } = await calculerNotesEleve(req.prisma, eleve.id, trimestre)

      const bulletin = await req.prisma.bulletin.upsert({
        where: { eleveId_trimestre_anneeScolaire: { eleveId: eleve.id, trimestre: parseInt(trimestre), anneeScolaire } },
        create: { eleveId: eleve.id, trimestre: parseInt(trimestre), anneeScolaire, dateGeneration: new Date() },
        update: { dateGeneration: new Date() }
      })

      return {
        bulletinId: bulletin.id,
        eleve: {
          id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule: eleve.matricule,
          classe: eleve.classe.nom,
          ecole: eleve.classe.ecole.nomComplet
        },
        notes,
        moyenneGenerale,
        appreciation: appreciation(moyenneGenerale)
      }
    }))

    // Rang dans le groupe généré (utile surtout quand toute la classe est générée en une fois)
    const classement = [...resultats].sort((a, b) => b.moyenneGenerale - a.moyenneGenerale)
    resultats.forEach(r => {
      r.rang = classement.findIndex(c => c.bulletinId === r.bulletinId) + 1
      r.effectif = resultats.length
    })

    res.status(201).json(resultats)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET BULLETIN DATA FOR PDF GENERATION / AFFICHAGE
router.get('/:bulletinId/data', verifyToken, async (req, res) => {
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

    const { notes, moyenneGenerale } = await calculerNotesEleve(req.prisma, bulletin.eleveId, bulletin.trimestre)

    res.json({
      bulletin,
      eleve: {
        nom: bulletin.eleve.nom,
        prenom: bulletin.eleve.prenom,
        matricule: bulletin.eleve.matricule,
        classe: bulletin.eleve.classe.nom,
        ecole: bulletin.eleve.classe.ecole.nomComplet
      },
      notes,
      moyenneGenerale,
      appreciation: appreciation(moyenneGenerale),
      trimestre: bulletin.trimestre,
      anneeScolaire: bulletin.anneeScolaire
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
