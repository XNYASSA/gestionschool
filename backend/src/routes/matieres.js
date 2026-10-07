import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET ALL MATIERES
router.get('/', verifyToken, async (req, res) => {
  try {
    const matieres = await req.prisma.matiere.findMany({
      include: { ecole: { select: { id: true, nomCourt: true } } },
      orderBy: [{ ecoleId: 'asc' }, { nom: 'asc' }]
    })
    res.json(matieres)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET MATIERES BY ÉCOLE (coefficients propres à cette école, collège ou primaire)
router.get('/ecole/:ecoleId', verifyToken, async (req, res) => {
  try {
    const matieres = await req.prisma.matiere.findMany({
      where: { ecoleId: req.params.ecoleId },
      orderBy: { nom: 'asc' }
    })
    res.json(matieres)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Vérifie que l'utilisateur (hors Super Admin) est affecté à l'école visée
async function verifierEcoleAutorisee(req, ecoleId) {
  const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
  return !ecoleIds || ecoleIds.includes(ecoleId)
}

// CREATE MATIERE (Super Admin, Principal, Directrice — pour une école qui leur est affectée)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { ecoleId, coefficient } = req.body
    const nom = String(req.body.nom ?? '').trim()
    const abreviation = String(req.body.abreviation ?? '').trim()
    const departement = String(req.body.departement ?? '').trim()

    if (!nom || !ecoleId) {
      return res.status(400).json({ error: 'Les champs nom et ecoleId sont obligatoires' })
    }
    if (nom.length > 100 || abreviation.length > 20 || departement.length > 60) {
      return res.status(400).json({ error: 'Nom, abréviation ou département trop long' })
    }
    if (!(await verifierEcoleAutorisee(req, ecoleId))) {
      return res.status(403).json({ error: "Cette école ne fait pas partie de celles qui vous sont affectées" })
    }

    const ecole = await req.prisma.ecole.findUnique({ where: { id: ecoleId }, select: { id: true } })
    if (!ecole) return res.status(404).json({ error: 'École non trouvée' })

    const existantes = await req.prisma.matiere.findMany({ where: { ecoleId }, select: { nom: true } })
    if (existantes.some(m => m.nom.trim().toLowerCase() === nom.toLowerCase())) {
      return res.status(409).json({ error: `La matière « ${nom} » existe déjà dans cette école` })
    }

    const matiere = await req.prisma.matiere.create({
      data: {
        nom,
        ecoleId,
        abreviation: abreviation || null,
        coefficient: coefficient ?? 0,
        departement: departement || null // regroupement affiché sur le bulletin ("GROUPE 1", "GROUPE 2"...)
      },
      include: { ecole: { select: { id: true, nomCourt: true } } }
    })
    res.status(201).json(matiere)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE MATIERE (Admin, Principal, Directrice - notamment pour ajuster les coefficients ;
// un Enseignant peut aussi ajuster le coefficient d'une matière qu'il enseigne, pas son nom)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'ENSEIGNANT']), async (req, res) => {
  try {
    const { nom, coefficient, departement } = req.body

    if (req.user.role === 'PRINCIPAL' || req.user.role === 'DIRECTRICE') {
      const existante = await req.prisma.matiere.findUnique({ where: { id: req.params.id }, select: { ecoleId: true } })
      if (!existante) return res.status(404).json({ error: 'Matière non trouvée' })
      if (!(await verifierEcoleAutorisee(req, existante.ecoleId))) {
        return res.status(403).json({ error: "Cette matière appartient à une école qui ne vous est pas affectée" })
      }
    }

    if (req.user.role === 'ENSEIGNANT') {
      if (nom !== undefined || departement !== undefined) {
        return res.status(403).json({ error: 'Vous ne pouvez modifier que le coefficient' })
      }
      const enseignant = await req.prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } })
      const ecm = enseignant && await req.prisma.enseignantClasseMatiere.findFirst({
        where: { enseignantId: enseignant.id, matiereId: req.params.id }
      })
      if (!ecm) {
        return res.status(403).json({ error: "Vous n'enseignez pas cette matière" })
      }
    }

    const matiere = await req.prisma.matiere.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(coefficient !== undefined && { coefficient }),
        ...(departement !== undefined && { departement: departement || null })
      },
      include: { ecole: { select: { id: true, nomCourt: true } } }
    })
    res.json(matiere)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matière non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE MATIERE (Admin only)
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    // Check if matiere is used
    const usageCount = await req.prisma.enseignantClasseMatiere.count({
      where: { matiereId: req.params.id }
    })

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer: ${usageCount} affectation(s) utilisent cette matière`
      })
    }

    await req.prisma.matiere.delete({
      where: { id: req.params.id }
    })
    res.json({ message: 'Matière supprimée avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matière non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
