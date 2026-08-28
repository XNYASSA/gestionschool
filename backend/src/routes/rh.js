import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { checkEcoleAccess } from '../middleware/checkEcoleAccess.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

const JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI']

// GET EMPLOYÉS D'UNE ÉCOLE (enseignants + personnel administratif)
router.get('/employes', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SURVEILLANT_GENERAL', 'SECRETAIRE']), checkEcoleAccess, async (req, res) => {
  try {
    const utilisateurEcoles = await req.prisma.utilisateurEcole.findMany({
      where: { ecoleId: req.query.ecoleId, actif: true },
      include: { utilisateur: { select: { id: true, nom: true, role: true, fonction: true } } },
      orderBy: { utilisateur: { nom: 'asc' } }
    })

    res.json(utilisateurEcoles.map(ue => ({
      utilisateurId: ue.utilisateur.id,
      nom: ue.utilisateur.nom,
      role: ue.role,
      fonction: ue.utilisateur.fonction
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET EMPLOI DU TEMPS D'UNE ÉCOLE
router.get('/horaires', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SURVEILLANT_GENERAL', 'SECRETAIRE']), checkEcoleAccess, async (req, res) => {
  try {
    const where = { ecoleId: req.query.ecoleId }
    if (req.query.utilisateurId) where.utilisateurId = req.query.utilisateurId

    const horaires = await req.prisma.horaireTravail.findMany({
      where,
      include: { utilisateur: { select: { nom: true, role: true } } },
      orderBy: [{ utilisateurId: 'asc' }, { jour: 'asc' }]
    })

    res.json(horaires)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE/UPDATE UN CRÉNEAU D'EMPLOI DU TEMPS (Surveillant Général, Principal, Directrice)
router.post('/horaires', verifyToken, checkRole(['SURVEILLANT_GENERAL', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), checkEcoleAccess, async (req, res) => {
  try {
    const { utilisateurId, ecoleId, jour, heureDebut, heureFin } = req.body

    if (!utilisateurId || !ecoleId || !jour || !heureDebut || !heureFin) {
      return res.status(400).json({ error: 'Champs obligatoires: utilisateurId, ecoleId, jour, heureDebut, heureFin' })
    }

    if (!JOURS.includes(jour)) {
      return res.status(400).json({ error: `jour doit être l'un de: ${JOURS.join(', ')}` })
    }

    const horaire = await req.prisma.horaireTravail.upsert({
      where: { utilisateurId_jour: { utilisateurId, jour } },
      create: { utilisateurId, ecoleId, jour, heureDebut, heureFin },
      update: { heureDebut, heureFin }
    })

    res.status(201).json(horaire)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE UN CRÉNEAU D'EMPLOI DU TEMPS
router.delete('/horaires/:id', verifyToken, checkRole(['SURVEILLANT_GENERAL', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    await req.prisma.horaireTravail.delete({ where: { id: req.params.id } })
    res.json({ message: 'Créneau supprimé' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Créneau non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

// GET PRÉSENCES DU PERSONNEL D'UNE ÉCOLE (filtrable par date)
router.get('/presences', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SURVEILLANT_GENERAL', 'SECRETAIRE']), checkEcoleAccess, async (req, res) => {
  try {
    const where = { ecoleId: req.query.ecoleId }
    if (req.query.date) {
      const jour = new Date(req.query.date)
      const lendemain = new Date(jour)
      lendemain.setDate(lendemain.getDate() + 1)
      where.date = { gte: jour, lt: lendemain }
    }

    const presences = await req.prisma.presencePersonnel.findMany({
      where,
      include: { utilisateur: { select: { nom: true, role: true } } },
      orderBy: { date: 'desc' }
    })

    res.json(presences)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// SAISIR/MODIFIER LA PRÉSENCE D'UN EMPLOYÉ (Surveillant Général, Principal, Directrice)
router.post('/presences', verifyToken, checkRole(['SURVEILLANT_GENERAL', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), checkEcoleAccess, async (req, res) => {
  try {
    const { utilisateurId, ecoleId, date, statut, heureArrivee, heureDepart, observation } = req.body

    if (!utilisateurId || !ecoleId || !date || !statut) {
      return res.status(400).json({ error: 'Champs obligatoires: utilisateurId, ecoleId, date, statut' })
    }

    if (!['PRESENT', 'ABSENT', 'RETARD'].includes(statut)) {
      return res.status(400).json({ error: 'statut doit être PRESENT, ABSENT ou RETARD' })
    }

    const dateJour = new Date(date)

    const presence = await req.prisma.presencePersonnel.upsert({
      where: { utilisateurId_date: { utilisateurId, date: dateJour } },
      create: { utilisateurId, ecoleId, date: dateJour, statut, heureArrivee: heureArrivee || null, heureDepart: heureDepart || null, observation: observation || null },
      update: { statut, heureArrivee: heureArrivee || null, heureDepart: heureDepart || null, observation: observation || null }
    })

    res.status(201).json(presence)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// RÉSUMÉ RH POUR L'ADMIN (Pédagogie > Emploi du temps) : horaires + taux de présence sur 30 jours
router.get('/resume', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    const where = { actif: true }
    if (req.query.ecoleId) {
      where.ecoleId = req.query.ecoleId
    } else if (ecoleIdsScope) {
      where.ecoleId = { in: ecoleIdsScope }
    }

    const utilisateurEcoles = await req.prisma.utilisateurEcole.findMany({
      where,
      include: {
        utilisateur: { select: { id: true, nom: true } },
        ecole: { select: { id: true, nomCourt: true } }
      },
      orderBy: { utilisateur: { nom: 'asc' } }
    })

    const ilYA30Jours = new Date()
    ilYA30Jours.setDate(ilYA30Jours.getDate() - 30)

    const resume = await Promise.all(utilisateurEcoles.map(async ue => {
      const [horaires, presences] = await Promise.all([
        req.prisma.horaireTravail.findMany({
          where: { utilisateurId: ue.utilisateurId },
          orderBy: { jour: 'asc' }
        }),
        req.prisma.presencePersonnel.findMany({
          where: { utilisateurId: ue.utilisateurId, date: { gte: ilYA30Jours } }
        })
      ])

      const totalJours = presences.length
      const presents = presences.filter(p => p.statut === 'PRESENT').length
      const absences = presences.filter(p => p.statut === 'ABSENT').length
      const retards = presences.filter(p => p.statut === 'RETARD').length

      return {
        utilisateurId: ue.utilisateurId,
        nom: ue.utilisateur.nom,
        role: ue.role,
        ecoleId: ue.ecole.id,
        ecoleNom: ue.ecole.nomCourt,
        horaires: horaires.map(h => ({ jour: h.jour, heureDebut: h.heureDebut, heureFin: h.heureFin })),
        tauxPresence: totalJours > 0 ? Math.round((presents / totalJours) * 100) : null,
        absences,
        retards,
        totalJoursSuivis: totalJours
      }
    }))

    res.json(resume)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
