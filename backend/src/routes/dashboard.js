import express from 'express'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET DASHBOARD DATA (rôle-spécifique)
router.get('/', verifyToken, async (req, res) => {
  try {
    const role = req.user.role

    if (role === 'PROPRIETAIRE') {
      return getDashboardProprietaire(req, res)
    } else if (role === 'DIRECTEUR') {
      return getDashboardDirecteur(req, res)
    } else if (role === 'SECRETAIRE') {
      return getDashboardSecretaire(req, res)
    } else if (role === 'ENSEIGNANT') {
      return getDashboardEnseignant(req, res)
    }

    res.status(403).json({ error: 'Rôle non supporté' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

async function getDashboardProprietaire(req, res) {
  try {
    const totalEleves = await req.prisma.eleve.count()
    const fraisCollectes = await req.prisma.inscriptionFrais.aggregate({
      _sum: { montantPaye: true }
    })
    const fraisRestant = await req.prisma.inscriptionFrais.aggregate({
      _sum: { montantDu: true }
    })
    const masseSalariale = await req.prisma.personnel.aggregate({
      _sum: { salaireMensuel: true }
    })
    const impayés = await req.prisma.inscriptionFrais.count({
      where: { statut: 'IMPAYE' }
    })

    const totalFraisCollectes = fraisCollectes._sum.montantPaye || 0
    const totalFraisDu = fraisRestant._sum.montantDu || 0

    // Récupérer les listes pour les tableaux
    const eleves = await req.prisma.eleve.findMany({
      include: { classe: true }
    })

    const frais = await req.prisma.inscriptionFrais.findMany({
      include: { eleve: true }
    })

    res.json({
      totalEleves,
      totalFraisCollectes,
      totalFraisDu,
      totalFraisRestant: totalFraisDu - totalFraisCollectes,
      percentageCollected: totalFraisDu > 0 ? ((totalFraisCollectes / totalFraisDu) * 100).toFixed(1) : 0,
      totalSalaries: masseSalariale._sum.salaireMensuel || 0,
      failedStudents: 0,
      attendanceRate: 85,
      eleves,
      frais
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

async function getDashboardDirecteur(req, res) {
  try {
    // Directeur a les mêmes données que le Propriétaire
    const totalEleves = await req.prisma.eleve.count()
    const fraisCollectes = await req.prisma.inscriptionFrais.aggregate({
      _sum: { montantPaye: true }
    })
    const fraisRestant = await req.prisma.inscriptionFrais.aggregate({
      _sum: { montantDu: true }
    })
    const masseSalariale = await req.prisma.personnel.aggregate({
      _sum: { salaireMensuel: true }
    })
    const impayés = await req.prisma.inscriptionFrais.count({
      where: { statut: 'IMPAYE' }
    })

    const totalFraisCollectes = fraisCollectes._sum.montantPaye || 0
    const totalFraisDu = fraisRestant._sum.montantDu || 0

    // Récupérer les listes pour les tableaux
    const eleves = await req.prisma.eleve.findMany({
      include: { classe: true }
    })

    const frais = await req.prisma.inscriptionFrais.findMany({
      include: { eleve: true }
    })

    res.json({
      totalEleves,
      totalFraisCollectes,
      totalFraisDu,
      totalFraisRestant: totalFraisDu - totalFraisCollectes,
      percentageCollected: totalFraisDu > 0 ? ((totalFraisCollectes / totalFraisDu) * 100).toFixed(1) : 0,
      totalSalaries: masseSalariale._sum.salaireMensuel || 0,
      impayés,
      eleves,
      frais
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

async function getDashboardSecretaire(req, res) {
  try {
    const totalEleves = await req.prisma.eleve.count()
    const paiementsEnAttente = await req.prisma.inscriptionFrais.count({
      where: { statut: 'PARTIEL' }
    })
    const impayés = await req.prisma.inscriptionFrais.count({
      where: { statut: 'IMPAYE' }
    })

    // Secrétaire peut voir les élèves et les frais
    const eleves = await req.prisma.eleve.findMany({
      include: { classe: true }
    })

    const frais = await req.prisma.inscriptionFrais.findMany({
      include: { eleve: true }
    })

    const totalFraisCollectes = frais.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
    const totalFraisDu = frais.reduce((sum, f) => sum + (f.montantDu || 0), 0)

    res.json({
      totalEleves,
      paiementsEnAttente,
      impayés,
      totalFraisCollectes,
      totalFraisDu,
      percentageCollected: totalFraisDu > 0 ? ((totalFraisCollectes / totalFraisDu) * 100).toFixed(1) : 0,
      eleves,
      frais
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

async function getDashboardEnseignant(req, res) {
  try {
    // Enseignant ne voit que ses classes
    const enseignant = await req.prisma.enseignant.findUnique({
      where: { utilisateurId: req.user.id },
      include: {
        classesMatieres: {
          include: {
            classe: { include: { eleves: true } }
          }
        }
      }
    })

    const mesClasses = enseignant?.classesMatieres.map(ecm => ecm.classeId) || []

    const eleves = await req.prisma.eleve.count({
      where: { classeId: { in: mesClasses } }
    })

    res.json({
      mesClasses: enseignant?.classesMatieres.map(ecm => ({
        ecmId: ecm.id,
        classeId: ecm.classeId,
        classe: ecm.classe.nom,
        section: ecm.classe.section,
        niveau: ecm.classe.niveau,
        matiere: ecm.matiere,
        totalEleves: ecm.classe.eleves?.length || 0
      })) || [],
      totalEleves: eleves
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export default router
