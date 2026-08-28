import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// GET FRAIS (Secretaire, Proprietaire) — limité aux écoles affectées pour les non-admin
router.get('/', verifyToken, checkRole(['SECRETAIRE', 'SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'ECONOMAT']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const frais = await req.prisma.inscriptionFrais.findMany({
      where: ecoleIds ? { eleve: { classe: { ecoleId: { in: ecoleIds } } } } : {},
      include: { eleve: { include: { classe: { include: { ecole: true } } } } }
    })
    res.json(frais)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ENREGISTRER PAIEMENT (Secretaire) — met à jour le solde ET journalise l'opération (Paiement)
router.post('/enregistrer-paiement', verifyToken, checkRole(['SECRETAIRE']), async (req, res) => {
  try {
    const { eleveId, montant, modePayement } = req.body

    // Trouver la première inscription impayée pour cet élève
    const frais = await req.prisma.inscriptionFrais.findFirst({
      where: {
        eleveId,
        statut: { not: 'SOLDE' }
      }
    })

    if (!frais) {
      return res.status(404).json({ error: 'Aucun frais à payer pour cet élève' })
    }

    const nouveauMontantPaye = frais.montantPaye + montant
    const nouveauStatut = nouveauMontantPaye >= frais.montantDu ? 'SOLDE' : 'PARTIEL'

    const [updated] = await req.prisma.$transaction([
      req.prisma.inscriptionFrais.update({
        where: { id: frais.id },
        data: {
          montantPaye: nouveauMontantPaye,
          modePayement,
          datePayement: new Date(),
          statut: nouveauStatut
        }
      }),
      req.prisma.paiement.create({
        data: {
          eleveId,
          inscriptionFraisId: frais.id,
          tranche: frais.tranche,
          montant,
          modePayement,
          effectueParId: req.user.id
        }
      })
    ])

    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET PAIEMENTS (journal des encaissements) — limité aux écoles affectées pour les non-admin
router.get('/paiements', verifyToken, checkRole(['SECRETAIRE', 'SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'ECONOMAT']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const paiements = await req.prisma.paiement.findMany({
      where: ecoleIds ? { eleve: { classe: { ecoleId: { in: ecoleIds } } } } : {},
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true, classe: { select: { nom: true, ecoleId: true } } } },
        effectuePar: { select: { id: true, nom: true } }
      },
      orderBy: { date: 'desc' }
    })

    res.json(paiements)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// VALIDER PAIEMENT (Directeur uniquement)
router.put('/:id/valider', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { statutValidation } = req.body // VALIDE ou REJETE

    if (!['VALIDE', 'REJETE'].includes(statutValidation)) {
      return res.status(400).json({ error: 'Statut de validation invalide' })
    }

    const frais = await req.prisma.inscriptionFrais.update({
      where: { id: req.params.id },
      data: { statutValidation },
      include: { eleve: { include: { classe: true } } }
    })

    res.json(frais)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
