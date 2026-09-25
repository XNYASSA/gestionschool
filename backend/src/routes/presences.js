import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET PRESENCES — limité aux écoles affectées ; filtrable par école, classe et date
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'SURVEILLANT_GENERAL', 'ENSEIGNANT']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    const { ecoleId, classeId, date, dateDebut, dateFin } = req.query

    if (ecoleId && ecoleIds && !ecoleIds.includes(ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const presences = await req.prisma.presence.findMany({
      where: {
        classe: {
          ...(ecoleIds && { ecoleId: { in: ecoleIds } }),
          ...(ecoleId && { ecoleId })
        },
        ...(classeId && { classeId }),
        ...(date && { date: new Date(date) }),
        ...((dateDebut || dateFin) && { date: { ...(dateDebut && { gte: new Date(dateDebut) }), ...(dateFin && { lte: new Date(dateFin) }) } })
      },
      select: { id: true, eleveId: true, classeId: true, date: true, statut: true, observation: true, eleve: { select: { id: true, nom: true, prenom: true, matricule: true } } }
    })
    res.json(presences)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ENREGISTRER PRESENCE (Enseignant, sur une classe qu'il enseigne)
router.post('/', verifyToken, checkRole(['ENSEIGNANT']), async (req, res) => {
  try {
    const { eleveId, classeId, date, statut, observation } = req.body

    if (!eleveId || !classeId || !date || !statut) {
      return res.status(400).json({ error: 'Champs obligatoires: eleveId, classeId, date, statut' })
    }

    const enseignant = await req.prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } })
    const ecm = enseignant && await req.prisma.enseignantClasseMatiere.findFirst({
      where: { enseignantId: enseignant.id, classeId }
    })
    if (!ecm) {
      return res.status(403).json({ error: "Vous n'enseignez pas dans cette classe" })
    }

    const presence = await req.prisma.presence.upsert({
      where: {
        eleveId_date: {
          eleveId,
          date: new Date(date)
        }
      },
      update: { statut, observation: observation || null },
      create: {
        eleveId,
        classeId,
        date: new Date(date),
        statut,
        observation: observation || null
      }
    })

    res.json(presence)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

const STATUTS_APPEL = ['PRESENT', 'ABSENT', 'JUSTIFIE', 'RETARD']

// ENREGISTRER L'APPEL D'UNE CLASSE (surveillant général, secrétaire, principal, directrice, admin) :
// une ou plusieurs lignes { eleveId, statut, observation } pour une même classe et une même date.
// Une ligne en erreur n'empêche pas l'enregistrement des autres.
router.post('/appel', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'SURVEILLANT_GENERAL']), async (req, res) => {
  try {
    const { classeId, date, presences } = req.body
    if (!classeId || !date || !Array.isArray(presences) || presences.length === 0) {
      return res.status(400).json({ error: 'classeId, date et presences (tableau non vide) requis' })
    }
    const jour = new Date(date)
    if (isNaN(jour.getTime())) return res.status(400).json({ error: 'Date invalide' })
    if (jour.getTime() > Date.now() + 24 * 3600 * 1000) return res.status(400).json({ error: "Impossible d'enregistrer une présence à une date future" })

    const classe = await req.prisma.classe.findUnique({ where: { id: classeId } })
    if (!classe) return res.status(404).json({ error: 'Classe non trouvée' })
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(classe.ecoleId)) {
      return res.status(403).json({ error: "Cette classe n'appartient pas à une école qui vous est affectée" })
    }

    const eleves = await req.prisma.eleve.findMany({ where: { classeId }, select: { id: true } })
    const elevesClasse = new Set(eleves.map(e => e.id))

    let enregistres = 0
    const erreurs = []
    for (const ligne of presences) {
      if (!elevesClasse.has(ligne.eleveId)) { erreurs.push(`Élève ${ligne.eleveId} absent de cette classe`); continue }
      if (!STATUTS_APPEL.includes(ligne.statut)) { erreurs.push(`Statut invalide « ${ligne.statut} »`); continue }
      const observation = String(ligne.observation ?? '').trim() || null
      await req.prisma.presence.upsert({
        where: { eleveId_date: { eleveId: ligne.eleveId, date: jour } },
        update: { statut: ligne.statut, observation, classeId },
        create: { eleveId: ligne.eleveId, classeId, date: jour, statut: ligne.statut, observation }
      })
      enregistres++
    }
    res.json({ enregistres, erreurs })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
