import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// Détail renvoyé avec chaque note : élève (et classe), matière, classe et enseignant de l'affectation
const includeNote = {
  eleve: { select: { id: true, nom: true, prenom: true, matricule: true, classeId: true, classe: { select: { id: true, nom: true, ecoleId: true, ecole: { select: { id: true, nomCourt: true } } } } } },
  enseignantClasseMatiere: {
    include: {
      matiere: { select: { id: true, nom: true, abreviation: true } },
      classe: { select: { id: true, nom: true, ecoleId: true } },
      enseignant: { include: { utilisateur: { select: { nom: true } } } }
    }
  }
}

// GET NOTES — un enseignant voit les siennes ; direction et secrétariat voient celles de leurs écoles
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ENSEIGNANT']), async (req, res) => {
  try {
    let where = {}

    if (req.user.role === 'ENSEIGNANT') {
      const enseignant = await req.prisma.enseignant.findUnique({
        where: { utilisateurId: req.user.id },
        include: { classesMatieres: true }
      })
      where = { ecmId: { in: enseignant?.classesMatieres.map(ecm => ecm.id) || [] } }
    } else {
      const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
      if (ecoleIds) where = { eleve: { classe: { ecoleId: { in: ecoleIds } } } }
      const { trimestre, classeId } = req.query
      if (trimestre) where = { ...where, trimestre: parseInt(trimestre) }
      if (classeId) where = { ...where, eleve: { ...(where.eleve || {}), classeId } }
    }

    const notes = await req.prisma.note.findMany({ where, include: includeNote, orderBy: [{ eleve: { nom: 'asc' } }, { eleve: { prenom: 'asc' } }] })
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

// Vérifie que la note appartient à une école de l'appelant
async function noteAutorisee(req, id) {
  const note = await req.prisma.note.findUnique({ where: { id }, include: { eleve: { include: { classe: true } } } })
  if (!note) return { erreur: { statut: 404, message: 'Note non trouvée' } }
  const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
  if (ecoleIds && !ecoleIds.includes(note.eleve.classe.ecoleId)) return { erreur: { statut: 403, message: "Cette note n'appartient pas à une école qui vous est affectée" } }
  return { note }
}

const ROLES_VALIDATION = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']

// VALIDER / REJETER UNE NOTE (direction et secrétariat)
for (const [action, statut] of [['valider', 'VALIDE'], ['rejeter', 'REJETE']]) {
  router.put(`/:id/${action}`, verifyToken, checkRole(ROLES_VALIDATION), async (req, res) => {
    try {
      const { note, erreur } = await noteAutorisee(req, req.params.id)
      if (erreur) return res.status(erreur.statut).json({ error: erreur.message })
      const maj = await req.prisma.note.update({
        where: { id: note.id },
        data: { statutValidation: statut, dateValidation: statut === 'VALIDE' ? new Date() : null }
      })
      res.json(maj)
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })
}

// VALIDER PLUSIEURS NOTES D'UN COUP : { ids: [...] }
router.post('/valider-lot', verifyToken, checkRole(ROLES_VALIDATION), async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids (tableau non vide) requis' })
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    const resultat = await req.prisma.note.updateMany({
      where: { id: { in: ids }, ...(ecoleIds && { eleve: { classe: { ecoleId: { in: ecoleIds } } } }) },
      data: { statutValidation: 'VALIDE', dateValidation: new Date() }
    })
    res.json({ validees: resultat.count })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
