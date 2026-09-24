import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'

const router = express.Router()

// Bulletin d'un élève : une ligne par matière du programme de sa classe (avec la
// note validée du trimestre si elle existe) et moyenne pondérée par les
// coefficients propres à la classe. Seules les matières notées comptent dans la moyenne.
async function calculerNotesEleve(prisma, eleveId, trimestre) {
  const eleve = await prisma.eleve.findUnique({ where: { id: eleveId }, select: { classeId: true } })

  const [programme, notesValidees] = await Promise.all([
    prisma.classeMatiere.findMany({ where: { classeId: eleve.classeId }, include: { matiere: true } }),
    prisma.note.findMany({
      where: {
        eleveId,
        trimestre: parseInt(trimestre),
        statutValidation: 'VALIDE'
      },
      include: {
        enseignantClasseMatiere: { include: { matiere: true } }
      }
    })
  ])

  const coefParMatiere = new Map(programme.map(p => [p.matiereId, p.coefficient]))
  const matieresNotees = new Set(notesValidees.map(n => n.enseignantClasseMatiere.matiereId))

  const lignes = [
    ...notesValidees.map(n => ({
      matiere: n.enseignantClasseMatiere.matiere.nom,
      note: n.valeur,
      coefficient: coefParMatiere.get(n.enseignantClasseMatiere.matiereId) ?? 0,
      observation: n.observation,
      mention: mentionMatiere(n.valeur)
    })),
    ...programme
      .filter(p => !matieresNotees.has(p.matiereId))
      .map(p => ({ matiere: p.matiere.nom, note: null, coefficient: p.coefficient, observation: null, mention: '' }))
  ].sort((a, b) => a.matiere.localeCompare(b.matiere))

  const notees = lignes.filter(l => l.note !== null)
  const totalCoefficients = notees.reduce((sum, l) => sum + l.coefficient, 0)
  const totalPoints = notees.reduce((sum, l) => sum + l.note * l.coefficient, 0)
  const moyenneGenerale = totalCoefficients > 0 ? Number((totalPoints / totalCoefficients).toFixed(2)) : 0

  return {
    notes: lignes,
    totalCoefficients,
    totalCoefficientsProgramme: programme.reduce((sum, p) => sum + p.coefficient, 0),
    programmeDefini: programme.length > 0,
    totalPoints,
    moyenneGenerale
  }
}

function appreciation(moyenne) {
  return moyenne >= 18 ? '⭐ Très Bien'
    : moyenne >= 15 ? '✅ Bien'
    : moyenne >= 13 ? '👍 Assez Bien'
    : moyenne >= 10 ? '📚 Passable'
    : '⚠️ Insuffisant'
}

// Mention par matière (échelle du modèle papier fourni par le client)
function mentionMatiere(note) {
  return note >= 18 ? 'Excellent'
    : note >= 16 ? 'Très bien'
    : note >= 14 ? 'Bien'
    : note >= 12 ? 'Assez bien'
    : note >= 10 ? 'Passable'
    : note >= 2 ? 'Très faible'
    : 'Nul'
}

// Rang de l'élève dans sa classe pour ce trimestre, recalculé à la volée
// (le rang n'est pas stocké : il dépend des notes de toute la classe, qui
// peuvent changer après la génération du bulletin).
async function calculerRang(prisma, eleve, trimestre) {
  const camarades = await prisma.eleve.findMany({ where: { classeId: eleve.classeId } })
  const moyennes = await Promise.all(camarades.map(async (e) => ({
    eleveId: e.id,
    moyenne: (await calculerNotesEleve(prisma, e.id, trimestre)).moyenneGenerale
  })))
  const classement = moyennes.sort((a, b) => b.moyenne - a.moyenne)
  return {
    rang: classement.findIndex(c => c.eleveId === eleve.id) + 1,
    effectif: camarades.length
  }
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

// GET BULLETIN BY ID
router.get('/:bulletinId', verifyToken, async (req, res) => {
  try {
    const bulletin = await req.prisma.bulletin.findUnique({
      where: { id: req.params.bulletinId },
      include: {
        eleve: {
          include: { classe: { include: { ecole: true } } }
        }
      }
    })

    if (!bulletin) {
      return res.status(404).json({ error: 'Bulletin non trouvé' })
    }

    res.json(bulletin)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GÉNÉRER LES BULLETINS : un élève, plusieurs élèves choisis, ou tous les élèves d'une classe
// (Principal/Directrice + Super Admin). Les notes et coefficients viennent de l'API en temps réel.
router.post('/generer', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { classeId, eleveIds, trimestre, anneeScolaire } = req.body

    if (!trimestre || !anneeScolaire || (!classeId && !(eleveIds?.length))) {
      return res.status(400).json({ error: 'trimestre, anneeScolaire et (classeId ou eleveIds) sont obligatoires' })
    }

    const eleves = classeId
      ? await req.prisma.eleve.findMany({
          where: { classeId },
          include: { classe: { include: { ecole: true } } },
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
        })
      : await req.prisma.eleve.findMany({
          where: { id: { in: eleveIds } },
          include: { classe: { include: { ecole: true } } }
        })

    if (eleves.length === 0) {
      return res.status(404).json({ error: 'Aucun élève trouvé pour cette sélection' })
    }

    const resultats = await Promise.all(eleves.map(async (eleve) => {
      const { notes, moyenneGenerale } = await calculerNotesEleve(req.prisma, eleve.id, trimestre)

      const bulletin = await req.prisma.bulletin.upsert({
        where: { eleveId_trimestre_anneeScolaire: { eleveId: eleve.id, trimestre: parseInt(trimestre), anneeScolaire } },
        create: { eleveId: eleve.id, trimestre: parseInt(trimestre), anneeScolaire, dateGeneration: new Date() },
        update: { dateGeneration: new Date() }
      })

      return {
        bulletinId: bulletin.id,
        eleve: {
          id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule: eleve.matricule,
          classe: eleve.classe.nom,
          ecole: eleve.classe.ecole.nomComplet
        },
        notes,
        moyenneGenerale,
        appreciation: appreciation(moyenneGenerale)
      }
    }))

    // Rang dans le groupe généré (utile surtout quand toute la classe est générée en une fois)
    const classement = [...resultats].sort((a, b) => b.moyenneGenerale - a.moyenneGenerale)
    resultats.forEach(r => {
      r.rang = classement.findIndex(c => c.bulletinId === r.bulletinId) + 1
      r.effectif = resultats.length
    })

    res.status(201).json(resultats)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET BULLETIN DATA FOR PDF GENERATION / AFFICHAGE
router.get('/:bulletinId/data', verifyToken, async (req, res) => {
  try {
    const bulletin = await req.prisma.bulletin.findUnique({
      where: { id: req.params.bulletinId },
      include: {
        eleve: {
          include: { classe: { include: { ecole: true } } }
        }
      }
    })

    if (!bulletin) {
      return res.status(404).json({ error: 'Bulletin non trouvé' })
    }

    const { notes, totalCoefficients, totalCoefficientsProgramme, programmeDefini, totalPoints, moyenneGenerale } = await calculerNotesEleve(req.prisma, bulletin.eleveId, bulletin.trimestre)
    const { rang, effectif } = await calculerRang(req.prisma, bulletin.eleve, bulletin.trimestre)

    res.json({
      bulletin,
      eleve: {
        nom: bulletin.eleve.nom,
        prenom: bulletin.eleve.prenom,
        matricule: bulletin.eleve.matricule,
        sexe: bulletin.eleve.sexe,
        dateNaissance: bulletin.eleve.dateNaissance,
        classe: bulletin.eleve.classe.nom,
        niveau: bulletin.eleve.classe.niveau
      },
      ecole: {
        nomCourt: bulletin.eleve.classe.ecole.nomCourt,
        nomComplet: bulletin.eleve.classe.ecole.nomComplet,
        niveau: bulletin.eleve.classe.ecole.niveau,
        adresse: bulletin.eleve.classe.ecole.adresse,
        telephone: bulletin.eleve.classe.ecole.telephone,
        email: bulletin.eleve.classe.ecole.email
      },
      effectif,
      rang,
      notes,
      totalCoefficients,
      totalCoefficientsProgramme,
      programmeDefini,
      totalPoints,
      moyenneGenerale,
      appreciation: appreciation(moyenneGenerale),
      trimestre: bulletin.trimestre,
      anneeScolaire: bulletin.anneeScolaire
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
