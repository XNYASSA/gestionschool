import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

const includeFull = {
  ecole: true,
  tranches: { orderBy: { numero: 'asc' } }
}

function calculerStatut(montantDu, montantPaye) {
  if (montantDu > 0 && montantPaye >= montantDu) return 'SOLDE'
  if (montantPaye > 0) return 'PARTIEL'
  return 'IMPAYE'
}

// Propage un montant de tranche (ou d'inscription) modifié dans ConfigurationFrais
// vers les fiches InscriptionFrais de tous les élèves de l'école concernée.
// Crée la ligne si l'élève n'en avait pas encore, sinon met à jour montantDu
// et recalcule le statut (le montant déjà payé n'est jamais touché).
async function synchroniserInscriptionsFrais(prisma, ecoleId, trancheLabel, nouveauMontant) {
  const eleves = await prisma.eleve.findMany({
    where: { classe: { ecoleId } },
    select: { id: true }
  })

  for (const eleve of eleves) {
    const existante = await prisma.inscriptionFrais.findFirst({
      where: { eleveId: eleve.id, tranche: trancheLabel }
    })

    if (existante) {
      await prisma.inscriptionFrais.update({
        where: { id: existante.id },
        data: {
          montantDu: nouveauMontant,
          statut: calculerStatut(nouveauMontant, existante.montantPaye)
        }
      })
    } else {
      await prisma.inscriptionFrais.create({
        data: {
          eleveId: eleve.id,
          tranche: trancheLabel,
          montantDu: nouveauMontant,
          montantPaye: 0,
          statut: 'IMPAYE',
          statutValidation: 'VALIDE'
        }
      })
    }
  }

  return eleves.length
}

// GET ALL CONFIGURATIONS (Super Admin : toutes ; Principal/Directrice : de leur(s) école(s))
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const configs = await req.prisma.configurationFrais.findMany({
      where: ecoleIds ? { ecoleId: { in: ecoleIds } } : {},
      include: includeFull,
      orderBy: { ecoleId: 'asc' }
    })
    res.json(configs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET CONFIGURATION BY ECOLE
router.get('/ecole/:ecoleId', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(req.params.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const config = await req.prisma.configurationFrais.findUnique({
      where: { ecoleId: req.params.ecoleId },
      include: includeFull
    })
    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée pour cette école' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE CONFIGURATION (Super Admin, ou Principal/Directrice pour leur école)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { ecoleId, montantInscription, dateLimiteInscription, tranches } = req.body

    if (!ecoleId) {
      return res.status(400).json({ error: 'Le champ ecoleId est obligatoire' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(ecoleId)) {
      return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
    }

    const trancheData = (tranches && tranches.length > 0)
      ? tranches.map((t, i) => ({
          numero: i + 1,
          montant: t.montant,
          dateLimite: t.dateLimite ? new Date(t.dateLimite) : null
        }))
      : [
          { numero: 1, montant: 30000 },
          { numero: 2, montant: 25000 },
          { numero: 3, montant: 25000 }
        ]

    const montantInscriptionFinal = montantInscription || 50000
    const montantFraisTotal = montantInscriptionFinal + trancheData.reduce((sum, t) => sum + t.montant, 0)

    const config = await req.prisma.configurationFrais.create({
      data: {
        ecoleId,
        montantInscription: montantInscriptionFinal,
        montantFraisTotal,
        dateLimiteInscription: dateLimiteInscription ? new Date(dateLimiteInscription) : null,
        tranches: { create: trancheData }
      },
      include: includeFull
    })

    // Appliquer immédiatement ces montants aux élèves déjà inscrits dans cette école
    await synchroniserInscriptionsFrais(req.prisma, ecoleId, 'inscription', montantInscriptionFinal)
    for (const t of trancheData) {
      await synchroniserInscriptionsFrais(req.prisma, ecoleId, `tranche${t.numero}`, t.montant)
    }

    res.status(201).json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE CONFIGURATION (montant inscription / date limite inscription) (Super Admin, ou Principal/Directrice pour leur école)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { montantInscription, dateLimiteInscription } = req.body

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope) {
      const configActuelle = await req.prisma.configurationFrais.findUnique({ where: { id: req.params.id } })
      if (!configActuelle || !ecoleIdsScope.includes(configActuelle.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cette configuration' })
      }
    }

    const config = await req.prisma.configurationFrais.update({
      where: { id: req.params.id },
      data: {
        ...(montantInscription !== undefined && { montantInscription }),
        ...(dateLimiteInscription !== undefined && { dateLimiteInscription: dateLimiteInscription ? new Date(dateLimiteInscription) : null })
      },
      include: includeFull
    })

    // Recalculer le montant total (inscription + toutes les tranches)
    const totalTranches = config.tranches.reduce((sum, t) => sum + t.montant, 0)
    const updated = await req.prisma.configurationFrais.update({
      where: { id: req.params.id },
      data: { montantFraisTotal: config.montantInscription + totalTranches },
      include: includeFull
    })

    // Propager le nouveau montant d'inscription à tous les élèves de l'école
    let elevesAffectes = 0
    if (montantInscription !== undefined) {
      elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, config.ecoleId, 'inscription', config.montantInscription)
    }

    res.json({ ...updated, elevesAffectes })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// ADD TRANCHE (Super Admin, ou Principal/Directrice pour leur école) — permet d'augmenter le nombre de tranches
router.post('/:configId/tranches', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { montant, dateLimite } = req.body
    if (!montant) {
      return res.status(400).json({ error: 'Le montant est obligatoire' })
    }

    const configuration = await req.prisma.configurationFrais.findUnique({ where: { id: req.params.configId } })
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(configuration.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette configuration' })
    }

    const existantes = await req.prisma.tranche.findMany({
      where: { configurationFraisId: req.params.configId },
      orderBy: { numero: 'desc' },
      take: 1
    })
    const prochainNumero = (existantes[0]?.numero || 0) + 1

    const tranche = await req.prisma.tranche.create({
      data: {
        configurationFraisId: req.params.configId,
        numero: prochainNumero,
        montant,
        dateLimite: dateLimite ? new Date(dateLimite) : null
      }
    })

    await recalculerMontantTotal(req.prisma, req.params.configId)

    // Créer la nouvelle échéance chez tous les élèves déjà inscrits dans cette école
    const elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, configuration.ecoleId, `tranche${prochainNumero}`, montant)

    res.status(201).json({ ...tranche, elevesAffectes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE TRANCHE (montant et/ou date limite) (Super Admin, ou Principal/Directrice pour leur école)
router.put('/:configId/tranches/:trancheNum', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { montant, dateLimite } = req.body
    const { configId, trancheNum } = req.params

    const configuration = await req.prisma.configurationFrais.findUnique({ where: { id: configId } })
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(configuration.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette configuration' })
    }

    const tranche = await req.prisma.tranche.update({
      where: {
        configurationFraisId_numero: {
          configurationFraisId: configId,
          numero: parseInt(trancheNum)
        }
      },
      data: {
        ...(montant !== undefined && { montant }),
        ...(dateLimite !== undefined && { dateLimite: dateLimite ? new Date(dateLimite) : null })
      }
    })

    await recalculerMontantTotal(req.prisma, configId)

    // Répercuter le nouveau montant sur les fiches de frais de tous les élèves de l'école
    let elevesAffectes = 0
    if (montant !== undefined) {
      elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, configuration.ecoleId, `tranche${trancheNum}`, montant)
    }

    res.json({ ...tranche, elevesAffectes })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tranche non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE TRANCHE (Super Admin, ou Principal/Directrice pour leur école) — permet de réduire le nombre de tranches
router.delete('/:configId/tranches/:trancheNum', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { configId, trancheNum } = req.params
    const trancheLabel = `tranche${trancheNum}`

    const configuration = await req.prisma.configurationFrais.findUnique({ where: { id: configId } })
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(configuration.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette configuration' })
    }

    // Empêcher la suppression si des élèves ont déjà payé sur cette tranche
    // (on ne supprime jamais un historique de paiement)
    const paiementsExistants = await req.prisma.inscriptionFrais.findFirst({
      where: {
        tranche: trancheLabel,
        montantPaye: { gt: 0 },
        eleve: { classe: { ecoleId: configuration.ecoleId } }
      }
    })

    if (paiementsExistants) {
      return res.status(400).json({
        error: 'Impossible de supprimer cette tranche : des paiements ont déjà été enregistrés dessus pour au moins un élève.'
      })
    }

    await req.prisma.tranche.delete({
      where: {
        configurationFraisId_numero: {
          configurationFraisId: configId,
          numero: parseInt(trancheNum)
        }
      }
    })

    await recalculerMontantTotal(req.prisma, configId)

    // Retirer les fiches de frais correspondantes (aucune n'a de paiement, cf. vérification ci-dessus)
    await req.prisma.inscriptionFrais.deleteMany({
      where: {
        tranche: trancheLabel,
        eleve: { classe: { ecoleId: configuration.ecoleId } }
      }
    })

    res.json({ message: 'Tranche supprimée avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tranche non trouvée' })
    }
    res.status(500).json({ error: error.message })
  }
})

async function recalculerMontantTotal(prisma, configId) {
  const config = await prisma.configurationFrais.findUnique({
    where: { id: configId },
    include: { tranches: true }
  })
  if (!config) return
  const totalTranches = config.tranches.reduce((sum, t) => sum + t.montant, 0)
  await prisma.configurationFrais.update({
    where: { id: configId },
    data: { montantFraisTotal: config.montantInscription + totalTranches }
  })
}

export default router
