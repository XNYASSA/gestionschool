import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'
import { calculerStatut } from '../utils/inscriptionsFrais.js'

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
      const nouveauStatut = calculerStatut(frais.montantDu, nouveauMontantPaye)

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

// Résout l'élève d'une ligne importée : par matricule si fourni, sinon par
// nom+prénom+classe (les fichiers des secrétaires ne suivent pas tous le même
// format et ne contiennent pas toujours de matricule fiable).
async function resoudreEleveLigne(prisma, ecoleIds, ligne) {
  const matricule = String(ligne.matricule || '').trim()
  if (matricule) {
    const eleve = await prisma.eleve.findFirst({
      where: { matricule, ...(ecoleIds ? { classe: { ecoleId: { in: ecoleIds } } } : {}) },
      include: { classe: true }
    })
    if (eleve) return eleve
  }

  const nom = String(ligne.nom || '').trim()
  const prenom = String(ligne.prenom || '').trim()
  const classe = String(ligne.classe || '').trim()
  if (!nom || !prenom || !classe) return null

  return prisma.eleve.findFirst({
    where: {
      nom: { equals: nom },
      prenom: { equals: prenom },
      classe: { nom: { equals: classe }, ...(ecoleIds ? { ecoleId: { in: ecoleIds } } : {}) }
    },
    include: { classe: true }
  })
}

// IMPORTER DES PAIEMENTS EN MASSE (Secrétaire) — même logique que
// /enregistrer-paiement, une ligne par élève avec un montant par poste précis.
router.post('/importer-paiements', verifyToken, checkRole(['SECRETAIRE']), async (req, res) => {
  try {
    const { lignes } = req.body
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'lignes (tableau non vide) requis' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    const resultats = []

    for (let i = 0; i < lignes.length; i++) {
      const numeroLigne = i + 1
      const ligne = lignes[i] || {}
      try {
        const eleve = await resoudreEleveLigne(req.prisma, ecoleIds, ligne)
        if (!eleve) throw new Error('Élève introuvable (vérifier matricule ou nom/prénom/classe)')

        const montants = {
          inscription: ligne.inscription,
          tranche1: ligne.tranche1,
          tranche2: ligne.tranche2,
          tranche3: ligne.tranche3
        }

        const postesEnregistres = []
        for (const [tranche, montantBrut] of Object.entries(montants)) {
          const montant = parseInt(montantBrut)
          if (!montant || montant <= 0) continue

          const frais = await req.prisma.inscriptionFrais.findFirst({ where: { eleveId: eleve.id, tranche } })
          if (!frais) continue

          const nouveauMontantPaye = frais.montantPaye + montant
          const nouveauStatut = calculerStatut(frais.montantDu, nouveauMontantPaye)

          await req.prisma.$transaction([
            req.prisma.inscriptionFrais.update({
              where: { id: frais.id },
              data: { montantPaye: nouveauMontantPaye, datePayement: new Date(), statut: nouveauStatut }
            }),
            req.prisma.paiement.create({
              data: { eleveId: eleve.id, inscriptionFraisId: frais.id, tranche, montant, effectueParId: req.user.id }
            })
          ])
          postesEnregistres.push(`${tranche}: ${montant.toLocaleString('fr-FR')} FCFA`)
        }

        if (postesEnregistres.length === 0) {
          throw new Error('Aucun montant valide à enregistrer pour cet élève')
        }

        resultats.push({ ligne: numeroLigne, succes: true, message: `${eleve.prenom} ${eleve.nom} — ${postesEnregistres.join(', ')}` })
      } catch (err) {
        resultats.push({ ligne: numeroLigne, succes: false, message: err.message })
      }
    }

    const reussis = resultats.filter(r => r.succes).length
    res.json({ total: lignes.length, reussis, echoues: lignes.length - reussis, resultats })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// IMPORTER DES VÉRIFICATIONS DE CAISSE EN MASSE (Économat) — même logique que
// /verification-paiement, une ligne par élève avec un montant perçu global.
router.post('/importer-verifications', verifyToken, checkRole(['ECONOMAT']), async (req, res) => {
  try {
    const { lignes } = req.body
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'lignes (tableau non vide) requis' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    const resultats = []

    for (let i = 0; i < lignes.length; i++) {
      const numeroLigne = i + 1
      const ligne = lignes[i] || {}
      try {
        const montant = parseInt(ligne.montant)
        if (!montant || montant <= 0) throw new Error('Montant perçu invalide')

        const eleve = await resoudreEleveLigne(req.prisma, ecoleIds, ligne)
        if (!eleve) throw new Error('Élève introuvable (vérifier matricule ou nom/prénom/classe)')

        await req.prisma.verificationPaiement.create({
          data: { eleveId: eleve.id, montant, effectueParId: req.user.id }
        })
        resultats.push({ ligne: numeroLigne, succes: true, message: `${eleve.prenom} ${eleve.nom} — ${montant.toLocaleString('fr-FR')} FCFA` })
      } catch (err) {
        resultats.push({ ligne: numeroLigne, succes: false, message: err.message })
      }
    }

    const reussis = resultats.filter(r => r.succes).length
    res.json({ total: lignes.length, reussis, echoues: lignes.length - reussis, resultats })
  } catch (error) {
    res.status(500).json({ error: error.message })
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
