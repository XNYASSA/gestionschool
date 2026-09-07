import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'
import { slugifier, synchroniserInscriptionsFrais } from '../utils/inscriptionsFrais.js'

const router = express.Router()

const includeFull = {
  ecole: true,
  tranches: { orderBy: { numero: 'asc' } },
  fraisAnnexes: true,
  niveaux: true
}

async function recalculerMontantTotal(prisma, configId) {
  const config = await prisma.configurationFrais.findUnique({
    where: { id: configId },
    include: { tranches: true, fraisAnnexes: true }
  })
  if (!config) return
  const totalTranches = config.tranches.reduce((sum, t) => sum + t.montant, 0)
  const totalFraisAnnexes = config.fraisAnnexes.reduce((sum, f) => sum + f.montant, 0)
  await prisma.configurationFrais.update({
    where: { id: configId },
    data: { montantFraisTotal: config.montantInscription + totalTranches + totalFraisAnnexes }
  })
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

// GET CONFIGURATIONS D'UNE ÉCOLE (une école peut avoir plusieurs barèmes)
router.get('/ecole/:ecoleId', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(req.params.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const configs = await req.prisma.configurationFrais.findMany({
      where: { ecoleId: req.params.ecoleId },
      include: includeFull,
      orderBy: { libelle: 'asc' }
    })
    res.json(configs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET LE BARÈME APPLICABLE À UN NIVEAU DONNÉ D'UNE ÉCOLE
router.get('/ecole/:ecoleId/niveau/:niveau', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ECONOMAT']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(req.params.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const lien = await req.prisma.configurationFraisNiveau.findUnique({
      where: { ecoleId_niveau: { ecoleId: req.params.ecoleId, niveau: req.params.niveau } },
      include: { configurationFrais: { include: includeFull } }
    })
    if (!lien) {
      return res.status(404).json({ error: `Aucun barème configuré pour le niveau "${req.params.niveau}"` })
    }
    res.json(lien.configurationFrais)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE CONFIGURATION (Super Admin, ou Principal/Directrice pour leur école)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { ecoleId, libelle, niveaux, montantInscription, dateLimiteInscription, fraisAnnexes, tranches } = req.body

    if (!ecoleId || !libelle || !Array.isArray(niveaux) || niveaux.length === 0) {
      return res.status(400).json({ error: 'ecoleId, libelle et niveaux (tableau non vide) sont obligatoires' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(ecoleId)) {
      return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
    }

    const conflits = await req.prisma.configurationFraisNiveau.findMany({
      where: { ecoleId, niveau: { in: niveaux } },
      include: { configurationFrais: { select: { libelle: true } } }
    })
    if (conflits.length > 0) {
      return res.status(409).json({
        error: `Niveau(x) déjà lié(s) à un autre barème : ${conflits.map(c => `${c.niveau} (${c.configurationFrais.libelle || 'sans nom'})`).join(', ')}`
      })
    }

    const trancheData = (tranches || []).map((t, i) => ({
      numero: i + 1,
      montant: t.montant,
      dateLimite: t.dateLimite ? new Date(t.dateLimite) : null
    }))
    const fraisAnnexeData = (fraisAnnexes || []).map(f => ({
      nom: f.nom,
      montant: f.montant,
      dateLimite: f.dateLimite ? new Date(f.dateLimite) : null
    }))

    const montantInscriptionFinal = montantInscription || 0
    const montantFraisTotal = montantInscriptionFinal
      + trancheData.reduce((sum, t) => sum + t.montant, 0)
      + fraisAnnexeData.reduce((sum, f) => sum + f.montant, 0)

    const config = await req.prisma.configurationFrais.create({
      data: {
        ecoleId,
        libelle,
        montantInscription: montantInscriptionFinal,
        montantFraisTotal,
        dateLimiteInscription: dateLimiteInscription ? new Date(dateLimiteInscription) : null,
        tranches: { create: trancheData },
        fraisAnnexes: { create: fraisAnnexeData },
        niveaux: { create: niveaux.map(niveau => ({ ecoleId, niveau })) }
      },
      include: includeFull
    })

    // Appliquer immédiatement ces montants aux élèves déjà inscrits dans ces niveaux
    await synchroniserInscriptionsFrais(req.prisma, config.id, 'inscription', "Frais d'inscription", montantInscriptionFinal)
    for (const t of config.tranches) {
      await synchroniserInscriptionsFrais(req.prisma, config.id, `tranche${t.numero}`, `Tranche ${t.numero}`, t.montant)
    }
    for (const f of config.fraisAnnexes) {
      await synchroniserInscriptionsFrais(req.prisma, config.id, `annexe_${slugifier(f.nom)}`, f.nom, f.montant)
    }

    res.status(201).json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE CONFIGURATION (libellé, niveaux, montant inscription, date limite) (Super Admin, ou Principal/Directrice pour leur école)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { libelle, niveaux, montantInscription, dateLimiteInscription } = req.body

    const configActuelle = await req.prisma.configurationFrais.findUnique({ where: { id: req.params.id } })
    if (!configActuelle) {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(configActuelle.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette configuration' })
    }

    if (niveaux) {
      const conflits = await req.prisma.configurationFraisNiveau.findMany({
        where: { ecoleId: configActuelle.ecoleId, niveau: { in: niveaux }, configurationFraisId: { not: req.params.id } },
        include: { configurationFrais: { select: { libelle: true } } }
      })
      if (conflits.length > 0) {
        return res.status(409).json({
          error: `Niveau(x) déjà lié(s) à un autre barème : ${conflits.map(c => `${c.niveau} (${c.configurationFrais.libelle || 'sans nom'})`).join(', ')}`
        })
      }
      await req.prisma.configurationFraisNiveau.deleteMany({ where: { configurationFraisId: req.params.id } })
      await req.prisma.configurationFraisNiveau.createMany({
        data: niveaux.map(niveau => ({ configurationFraisId: req.params.id, ecoleId: configActuelle.ecoleId, niveau }))
      })
    }

    await req.prisma.configurationFrais.update({
      where: { id: req.params.id },
      data: {
        ...(libelle !== undefined && { libelle }),
        ...(montantInscription !== undefined && { montantInscription }),
        ...(dateLimiteInscription !== undefined && { dateLimiteInscription: dateLimiteInscription ? new Date(dateLimiteInscription) : null })
      }
    })

    await recalculerMontantTotal(req.prisma, req.params.id)
    const updated = await req.prisma.configurationFrais.findUnique({ where: { id: req.params.id }, include: includeFull })

    let elevesAffectes = 0
    if (montantInscription !== undefined) {
      elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, req.params.id, 'inscription', "Frais d'inscription", updated.montantInscription)
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

    const elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, req.params.configId, `tranche${prochainNumero}`, `Tranche ${prochainNumero}`, montant)

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

    let elevesAffectes = 0
    if (montant !== undefined) {
      elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, configId, `tranche${trancheNum}`, `Tranche ${trancheNum}`, montant)
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

// ADD FRAIS ANNEXE (Super Admin, ou Principal/Directrice pour leur école)
router.post('/:configId/frais-annexes', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { nom, montant, dateLimite } = req.body
    if (!nom || !montant) {
      return res.status(400).json({ error: 'nom et montant sont obligatoires' })
    }

    const configuration = await req.prisma.configurationFrais.findUnique({ where: { id: req.params.configId } })
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration non trouvée' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(configuration.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette configuration' })
    }

    const fraisAnnexe = await req.prisma.fraisAnnexe.create({
      data: {
        configurationFraisId: req.params.configId,
        nom,
        montant,
        dateLimite: dateLimite ? new Date(dateLimite) : null
      }
    })

    await recalculerMontantTotal(req.prisma, req.params.configId)
    const elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, req.params.configId, `annexe_${slugifier(nom)}`, nom, montant)

    res.status(201).json({ ...fraisAnnexe, elevesAffectes })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Un frais annexe portant ce nom existe déjà pour ce barème' })
    }
    res.status(500).json({ error: error.message })
  }
})

// UPDATE FRAIS ANNEXE (Super Admin, ou Principal/Directrice pour leur école)
router.put('/frais-annexes/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { montant, dateLimite } = req.body

    const existante = await req.prisma.fraisAnnexe.findUnique({
      where: { id: req.params.id },
      include: { configurationFrais: true }
    })
    if (!existante) {
      return res.status(404).json({ error: 'Frais annexe non trouvé' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(existante.configurationFrais.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const fraisAnnexe = await req.prisma.fraisAnnexe.update({
      where: { id: req.params.id },
      data: {
        ...(montant !== undefined && { montant }),
        ...(dateLimite !== undefined && { dateLimite: dateLimite ? new Date(dateLimite) : null })
      }
    })

    await recalculerMontantTotal(req.prisma, existante.configurationFraisId)

    let elevesAffectes = 0
    if (montant !== undefined) {
      elevesAffectes = await synchroniserInscriptionsFrais(req.prisma, existante.configurationFraisId, `annexe_${slugifier(existante.nom)}`, existante.nom, montant)
    }

    res.json({ ...fraisAnnexe, elevesAffectes })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Frais annexe non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

// DELETE FRAIS ANNEXE (Super Admin, ou Principal/Directrice pour leur école)
router.delete('/frais-annexes/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const existante = await req.prisma.fraisAnnexe.findUnique({
      where: { id: req.params.id },
      include: { configurationFrais: true }
    })
    if (!existante) {
      return res.status(404).json({ error: 'Frais annexe non trouvé' })
    }

    const ecoleIdsScope = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIdsScope && !ecoleIdsScope.includes(existante.configurationFrais.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const trancheLabel = `annexe_${slugifier(existante.nom)}`

    const paiementsExistants = await req.prisma.inscriptionFrais.findFirst({
      where: {
        tranche: trancheLabel,
        montantPaye: { gt: 0 },
        eleve: { classe: { ecoleId: existante.configurationFrais.ecoleId } }
      }
    })
    if (paiementsExistants) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce frais annexe : des paiements ont déjà été enregistrés dessus pour au moins un élève.'
      })
    }

    await req.prisma.fraisAnnexe.delete({ where: { id: req.params.id } })
    await recalculerMontantTotal(req.prisma, existante.configurationFraisId)
    await req.prisma.inscriptionFrais.deleteMany({
      where: {
        tranche: trancheLabel,
        eleve: { classe: { ecoleId: existante.configurationFrais.ecoleId } }
      }
    })

    res.json({ message: 'Frais annexe supprimé avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Frais annexe non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
