import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// GET NOTES (selon le rôle)
router.get('/', verifyToken, async (req, res) => {
  try {
    let notes

    if (req.user.role === 'ENSEIGNANT') {
      // Enseignant voit uniquement ses notes
      const enseignant = await req.prisma.enseignant.findUnique({
        where: { utilisateurId: req.user.id },
        include: { classesMatieres: true }
      })

      const ecmIds = enseignant?.classesMatieres.map(ecm => ecm.id) || []

      notes = await req.prisma.note.findMany({
        where: { ecmId: { in: ecmIds } },
        include: { eleve: true, enseignantClasseMatiere: true }
      })
    } else {
      // Autres rôles voient tout
      notes = await req.prisma.note.findMany({
        include: { eleve: true, enseignantClasseMatiere: true }
      })
    }

    res.json(notes)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE/UPDATE NOTE (Enseignant, sur une affectation classe/matière qui est la sienne)
router.post('/', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const { eleveId, ecmId, trimestre, valeur, observation } = req.body

    if (!eleveId || !ecmId || !trimestre || valeur === undefined) {
      return res.status(400).json({ error: 'Champs obligatoires: eleveId, ecmId, trimestre, valeur' })
    }

    const enseignant = await req.prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } })
    const ecm = enseignant && await req.prisma.enseignantClasseMatiere.findFirst({
      where: { id: ecmId, enseignantId: enseignant.id }
    })
    if (!ecm) {
      return res.status(403).json({ error: "Cette affectation classe/matière ne vous appartient pas" })
    }

    const eleve = await req.prisma.eleve.findUnique({ where: { id: eleveId } })
    if (!eleve || eleve.classeId !== ecm.classeId) {
      return res.status(400).json({ error: "Cet élève n'appartient pas à cette classe" })
    }

    const note = await req.prisma.note.create({
      data: {
        eleveId,
        ecmId,
        trimestre,
        valeur,
        observation: observation || null
      }
    })

    res.status(201).json(note)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// VALIDER NOTE (Directeur)
router.put('/:id/valider', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const note = await req.prisma.note.update({
      where: { id: req.params.id },
      data: { statutValidation: 'VALIDÉ' }
    })
    res.json(note)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
