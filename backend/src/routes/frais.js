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

// ENREGISTRER PAIEMENT (Secretaire) — un montant par poste précis (inscription,
// tranche1, tranche2...), pas d'allocation automatique sur "la première échéance
// impayée" : la secrétaire indique exactement ce qui a été reçu pour chaque poste.
router.post('/enregistrer-paiement', verifyToken, checkRole(['SECRETAIRE']), async (req, res) => {
  try {
    const { eleveId, montants } = req.body // { inscription?: number, tranche1?: number, ... }

    if (!eleveId || !montants || typeof montants !== 'object') {
      return res.status(400).json({ error: 'eleveId et montants requis' })
    }

    const resultats = []
    for (const [tranche, montantBrut] of Object.entries(montants)) {
      const montant = parseInt(montantBrut)
      if (!montant || montant <= 0) continue

      const frais = await req.prisma.inscriptionFrais.findFirst({ where: { eleveId, tranche } })
      if (!frais) {
        resultats.push({ tranche, succes: false, message: `Poste "${tranche}" introuvable pour cet élève` })
        continue
      }

      const nouveauMontantPaye = frais.montantPaye + montant
      const nouveauStatut = nouveauMontantPaye >= frais.montantDu ? 'SOLDE' : 'PARTIEL'

      await req.prisma.$transaction([
        req.prisma.inscriptionFrais.update({
          where: { id: frais.id },
          data: { montantPaye: nouveauMontantPaye, datePayement: new Date(), statut: nouveauStatut }
        }),
        req.prisma.paiement.create({
          data: { eleveId, inscriptionFraisId: frais.id, tranche, montant, effectueParId: req.user.id }
        })
      ])

      resultats.push({ tranche, succes: true, message: `${montant.toLocaleString('fr-FR')} FCFA enregistré(s)` })
    }

    if (resultats.length === 0) {
      return res.status(400).json({ error: 'Aucun montant à enregistrer' })
    }

    res.json({ resultats })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// ENREGISTRER UNE VÉRIFICATION DE CAISSE (Économat) — déclaration indépendante,
// n'affecte jamais le solde de l'élève : sert uniquement à la réconciliation
// avec les montants déclarés par la Secrétaire (voir GET /verifications-paiement).
router.post('/verification-paiement', verifyToken, checkRole(['ECONOMAT']), async (req, res) => {
  try {
    const { eleveId, montant } = req.body
    if (!eleveId || !montant || parseInt(montant) <= 0) {
      return res.status(400).json({ error: 'eleveId et montant (positif) requis' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const eleve = await req.prisma.eleve.findUnique({ where: { id: eleveId }, include: { classe: true } })
      if (!eleve || !ecoleIds.includes(eleve.classe.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cet élève' })
      }
    }

    const verification = await req.prisma.verificationPaiement.create({
      data: { eleveId, montant: parseInt(montant), effectueParId: req.user.id }
    })
    res.status(201).json(verification)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET VÉRIFICATIONS DE CAISSE — limité aux écoles affectées pour les non-admin
router.get('/verifications-paiement', verifyToken, checkRole(['ECONOMAT', 'SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const verifications = await req.prisma.verificationPaiement.findMany({
      where: ecoleIds ? { eleve: { classe: { ecoleId: { in: ecoleIds } } } } : {},
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true, classe: { select: { nom: true, ecoleId: true } } } },
        effectuePar: { select: { id: true, nom: true } }
      },
      orderBy: { date: 'desc' }
    })

    res.json(verifications)
  } catch (error) {
    res.status(500).json({ error: error.message })
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
