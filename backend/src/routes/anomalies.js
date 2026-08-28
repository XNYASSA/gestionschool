import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

const SEUIL_ANOMALIE = 500 // 500 FCFA

// Fonction pour comparer les saisies et détecter les anomalies
async function detecterAnomalies(prisma, ecoleId, date) {
  const dateDebut = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dateFin = new Date(dateDebut.getTime() + 24 * 60 * 60 * 1000)

  // Récupérer les saisies des 3 rôles pour cette date
  const saisiesSecretaire = await prisma.saisieQuotidienne.findMany({
    where: {
      ecoleId,
      date: { gte: dateDebut, lt: dateFin },
      role: 'SECRETAIRE',
      type: 'FRAIS_COLLECTES'
    }
  })

  const saisiesPrincipal = await prisma.saisieQuotidienne.findMany({
    where: {
      ecoleId,
      date: { gte: dateDebut, lt: dateFin },
      role: { in: ['PRINCIPAL', 'DIRECTRICE'] },
      type: 'FRAIS_COLLECTES'
    }
  })

  const saisiesEconomat = await prisma.saisieQuotidienne.findMany({
    where: {
      ecoleId,
      date: { gte: dateDebut, lt: dateFin },
      role: 'ECONOMAT',
      type: 'FRAIS_COLLECTES'
    }
  })

  const anomalies = []

  // Comparer les montants totaux
  const totalSecretaire = saisiesSecretaire.reduce((sum, s) => {
    const donnees = JSON.parse(s.donnees)
    return sum + (donnees.montantTotal || 0)
  }, 0)

  const totalPrincipal = saisiesPrincipal.reduce((sum, s) => {
    const donnees = JSON.parse(s.donnees)
    return sum + (donnees.montantTotal || 0)
  }, 0)

  const totalEconomat = saisiesEconomat.reduce((sum, s) => {
    const donnees = JSON.parse(s.donnees)
    return sum + (donnees.montantTotal || 0)
  }, 0)

  // Détecter les écarts
  if (Math.abs(totalSecretaire - totalPrincipal) > SEUIL_ANOMALIE) {
    anomalies.push({
      ecoleId,
      date: dateDebut,
      source1: 'SECRETAIRE',
      source2: 'PRINCIPAL',
      valeur1: JSON.stringify({ montantTotal: totalSecretaire }),
      valeur2: JSON.stringify({ montantTotal: totalPrincipal }),
      montant: totalSecretaire,
      ecartsDetectes: JSON.stringify({
        ecart_frais: totalSecretaire - totalPrincipal
      })
    })
  }

  if (Math.abs(totalSecretaire - totalEconomat) > SEUIL_ANOMALIE) {
    anomalies.push({
      ecoleId,
      date: dateDebut,
      source1: 'SECRETAIRE',
      source2: 'ECONOMAT',
      valeur1: JSON.stringify({ montantTotal: totalSecretaire }),
      valeur2: JSON.stringify({ montantTotal: totalEconomat }),
      montant: totalSecretaire,
      ecartsDetectes: JSON.stringify({
        ecart_frais: totalSecretaire - totalEconomat
      })
    })
  }

  if (Math.abs(totalPrincipal - totalEconomat) > SEUIL_ANOMALIE) {
    anomalies.push({
      ecoleId,
      date: dateDebut,
      source1: 'PRINCIPAL',
      source2: 'ECONOMAT',
      valeur1: JSON.stringify({ montantTotal: totalPrincipal }),
      valeur2: JSON.stringify({ montantTotal: totalEconomat }),
      montant: totalPrincipal,
      ecartsDetectes: JSON.stringify({
        ecart_frais: totalPrincipal - totalEconomat
      })
    })
  }

  // Créer les anomalies détectées
  for (const anomalie of anomalies) {
    await prisma.anomalieDetetee.create({
      data: anomalie
    })
  }

  return anomalies
}

// Calcule la plage [début, fin) d'une période (jour/semaine/mois) ancrée sur une date de référence
function calculerPeriode(period, dateRef) {
  const ref = new Date(dateRef)

  if (period === 'semaine') {
    const fin = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1)
    const debut = new Date(fin.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { debut, fin }
  }

  if (period === 'mois') {
    const debut = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
    return { debut, fin }
  }

  // jour (par défaut)
  const debut = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000)
  return { debut, fin }
}

function totalDeclare(saisies) {
  return saisies.reduce((sum, s) => {
    const donnees = JSON.parse(s.donnees)
    return sum + (donnees.montantTotal || 0)
  }, 0)
}

// RAPPORT DE RAPPROCHEMENT (Économat / Secrétaire / Principal-Directrice vs données système)
// pour une période (jour/semaine/mois) ancrée sur une date choisie par l'admin.
router.get('/rapport', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { ecoleId, period = 'jour', date } = req.query

    if (!ecoleId) {
      return res.status(400).json({ error: 'ecoleId requis' })
    }

    const { debut, fin } = calculerPeriode(period, date ? new Date(date) : new Date())

    const [saisiesSecretaire, saisiesPrincipal, saisiesEconomat, paiements] = await Promise.all([
      req.prisma.saisieQuotidienne.findMany({
        where: { ecoleId, date: { gte: debut, lt: fin }, role: 'SECRETAIRE', type: 'FRAIS_COLLECTES' }
      }),
      req.prisma.saisieQuotidienne.findMany({
        where: { ecoleId, date: { gte: debut, lt: fin }, role: { in: ['PRINCIPAL', 'DIRECTRICE'] }, type: 'FRAIS_COLLECTES' }
      }),
      req.prisma.saisieQuotidienne.findMany({
        where: { ecoleId, date: { gte: debut, lt: fin }, role: 'ECONOMAT', type: 'FRAIS_COLLECTES' }
      }),
      req.prisma.inscriptionFrais.findMany({
        where: {
          datePayement: { gte: debut, lt: fin },
          montantPaye: { gt: 0 },
          eleve: { classe: { ecoleId } }
        }
      })
    ])

    const declarations = {
      secretaire: totalDeclare(saisiesSecretaire),
      principal: totalDeclare(saisiesPrincipal),
      economat: totalDeclare(saisiesEconomat)
    }

    const detailSysteme = {
      inscriptions: paiements.filter(p => p.tranche === 'inscription').reduce((s, p) => s + p.montantPaye, 0),
      pensions: paiements.filter(p => p.tranche !== 'inscription').reduce((s, p) => s + p.montantPaye, 0)
    }
    detailSysteme.total = detailSysteme.inscriptions + detailSysteme.pensions

    // Comparaisons deux-à-deux entre les 3 déclarations, et chacune vs le total système réel
    const sources = [
      { nom: 'SECRETAIRE', montant: declarations.secretaire },
      { nom: 'PRINCIPAL', montant: declarations.principal },
      { nom: 'ECONOMAT', montant: declarations.economat },
      { nom: 'SYSTEME', montant: detailSysteme.total }
    ]

    const incoherences = []
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const ecart = sources[i].montant - sources[j].montant
        if (Math.abs(ecart) > SEUIL_ANOMALIE) {
          incoherences.push({
            source1: sources[i].nom,
            source2: sources[j].nom,
            montant1: sources[i].montant,
            montant2: sources[j].montant,
            ecart
          })
        }
      }
    }

    res.json({
      periode: { type: period, debut, fin },
      declarations,
      detailSysteme,
      incoherences
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET ANOMALIES (Super Admin only)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { ecoleId, date, resolue } = req.query

    const filters = {}
    if (ecoleId) filters.ecoleId = ecoleId
    if (resolue !== undefined) filters.resolue = resolue === 'true'

    if (date) {
      const dateObj = new Date(date)
      filters.date = {
        gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
      }
    }

    const anomalies = await req.prisma.anomalieDetetee.findMany({
      where: filters,
      include: {
        ecole: true,
        eleve: true
      },
      orderBy: { date: 'desc' }
    })

    res.json(anomalies.map(a => ({
      ...a,
      ecartsDetectes: JSON.parse(a.ecartsDetectes),
      valeur1: JSON.parse(a.valeur1),
      valeur2: JSON.parse(a.valeur2)
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DETECT ANOMALIES FOR A DATE (Super Admin only)
router.post('/detect/:ecoleId', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { date } = req.body

    if (!date) {
      return res.status(400).json({ error: 'date requise' })
    }

    const anomalies = await detecterAnomalies(req.prisma, req.params.ecoleId, new Date(date))

    res.json({
      message: `${anomalies.length} anomalie(s) détectée(s)`,
      anomalies
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// MARK ANOMALY AS RESOLVED (Super Admin only)
router.patch('/:anomalieId/resoudre', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const anomalie = await req.prisma.anomalieDetetee.update({
      where: { id: req.params.anomalieId },
      data: { resolue: true }
    })

    res.json({
      ...anomalie,
      ecartsDetectes: JSON.parse(anomalie.ecartsDetectes)
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// DELETE ANOMALY (Super Admin only)
router.delete('/:anomalieId', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await req.prisma.anomalieDetetee.delete({
      where: { id: req.params.anomalieId }
    })

    res.json({ message: 'Anomalie supprimée' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
