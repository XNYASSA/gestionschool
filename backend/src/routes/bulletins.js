import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'
import { construireBulletin } from '../utils/bulletinData.js'

const router = express.Router()

const ROLES_GENERATION = ['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'SUPER_ADMIN']

class ErreurMetier extends Error {
  constructor(message, statut = 400) {
    super(message)
    this.statut = statut
  }
}
const reponseErreur = (res, error) => res.status(error.statut || 500).json({ error: error.message })

async function chargerEleveAutorise(req, eleveId) {
  const eleve = eleveId ? await req.prisma.eleve.findUnique({ where: { id: eleveId }, include: { classe: { include: { ecole: true } } } }) : null
  if (!eleve) throw new ErreurMetier('Élève non trouvé', 404)
  const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
  if (ecoleIds && !ecoleIds.includes(eleve.classe.ecoleId)) throw new ErreurMetier("Cet élève n'appartient pas à une école qui vous est affectée", 403)
  return eleve
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

// GÉNÉRER LES BULLETINS : un élève, plusieurs élèves choisis, ou tous les élèves d'une classe.
// Ne fait que créer/mettre à jour la fiche Bulletin (date de génération) : les notes, moyennes et
// classement sont toujours recalculés à la volée à l'affichage (GET /:bulletinId/data), jamais figés ici.
router.post('/generer', verifyToken, checkRole(ROLES_GENERATION), async (req, res) => {
  try {
    const { classeId, eleveIds, trimestre, anneeScolaire } = req.body
    if (!trimestre || !anneeScolaire || (!classeId && !(eleveIds?.length))) {
      return res.status(400).json({ error: 'trimestre, anneeScolaire et (classeId ou eleveIds) sont obligatoires' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    const eleves = classeId
      ? await req.prisma.eleve.findMany({ where: { classeId }, include: { classe: { include: { ecole: true } } }, orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] })
      : await req.prisma.eleve.findMany({ where: { id: { in: eleveIds } }, include: { classe: { include: { ecole: true } } } })

    if (eleves.length === 0) return res.status(404).json({ error: 'Aucun élève trouvé pour cette sélection' })
    if (ecoleIds && eleves.some(e => !ecoleIds.includes(e.classe.ecoleId))) {
      return res.status(403).json({ error: "Cette classe n'appartient pas à une école qui vous est affectée" })
    }

    const resultats = []
    for (const eleve of eleves) {
      const bulletin = await req.prisma.bulletin.upsert({
        where: { eleveId_trimestre_anneeScolaire: { eleveId: eleve.id, trimestre: parseInt(trimestre), anneeScolaire } },
        create: { eleveId: eleve.id, trimestre: parseInt(trimestre), anneeScolaire, dateGeneration: new Date() },
        update: { dateGeneration: new Date() }
      })
      const donnees = await construireBulletin(req.prisma, eleve, trimestre, anneeScolaire, bulletin)
      resultats.push({ bulletinId: bulletin.id, ...donnees })
    }

    res.status(201).json(resultats)
  } catch (error) {
    reponseErreur(res, error)
  }
})

// GET BULLETIN DATA — toutes les données prêtes pour l'affichage / l'impression
router.get('/:bulletinId/data', verifyToken, async (req, res) => {
  try {
    const bulletin = await req.prisma.bulletin.findUnique({
      where: { id: req.params.bulletinId },
      include: { eleve: { include: { classe: { include: { ecole: true } } } } }
    })
    if (!bulletin) return res.status(404).json({ error: 'Bulletin non trouvé' })

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(bulletin.eleve.classe.ecoleId)) {
      return res.status(403).json({ error: "Ce bulletin n'appartient pas à une école qui vous est affectée" })
    }

    const donnees = await construireBulletin(req.prisma, bulletin.eleve, bulletin.trimestre, bulletin.anneeScolaire, bulletin)
    res.json({ bulletinId: bulletin.id, ...donnees })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// METTRE À JOUR LA DISCIPLINE / LE CONSEIL DE CLASSE d'un bulletin (saisie manuelle, sans autre source)
router.put('/:bulletinId/discipline', verifyToken, checkRole(ROLES_GENERATION), async (req, res) => {
  try {
    const bulletin = await req.prisma.bulletin.findUnique({ where: { id: req.params.bulletinId }, include: { eleve: { include: { classe: true } } } })
    if (!bulletin) return res.status(404).json({ error: 'Bulletin non trouvé' })
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(bulletin.eleve.classe.ecoleId)) {
      return res.status(403).json({ error: "Ce bulletin n'appartient pas à une école qui vous est affectée" })
    }

    const champsBooleens = ['exclusionDefinitive', 'absenteisme', 'conduiteDeplorable', 'convocation', 'tableauHonneur', 'encouragement', 'felicitations', 'avertissementTravail', 'blameTravail', 'avertissementConduite', 'blameConduite']
    const data = {}
    champsBooleens.forEach(c => { if (req.body[c] !== undefined) data[c] = !!req.body[c] })
    if (req.body.joursExclusion !== undefined) data.joursExclusion = req.body.joursExclusion === '' || req.body.joursExclusion === null ? null : parseInt(req.body.joursExclusion)
    if (req.body.observationConseil !== undefined) data.observationConseil = req.body.observationConseil || null

    const maj = await req.prisma.bulletin.update({ where: { id: bulletin.id }, data })
    res.json(maj)
  } catch (error) {
    reponseErreur(res, error)
  }
})

export default router
