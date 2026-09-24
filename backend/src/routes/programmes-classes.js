import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

class ErreurMetier extends Error {
  constructor(message, statut = 400) {
    super(message)
    this.statut = statut
  }
}

async function chargerClasseAutorisee(req, classeId) {
  const classe = await req.prisma.classe.findUnique({ where: { id: classeId }, include: { ecole: true } })
  if (!classe) throw new ErreurMetier('Classe non trouvée', 404)

  const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
  if (ecoleIds && !ecoleIds.includes(classe.ecoleId)) {
    throw new ErreurMetier("Cette classe n'appartient pas à une école qui vous est affectée", 403)
  }
  return classe
}

const aDejaDuTravail = (affectation) => affectation._count.notes > 0 || affectation._count.lecons > 0

// Programme d'une classe : toutes les matières de son école, avec pour chacune
// si elle est cochée, son coefficient dans cette classe et son enseignant.
async function construireProgramme(prisma, classe) {
  const [matieres, programme, affectations] = await Promise.all([
    prisma.matiere.findMany({ where: { ecoleId: classe.ecoleId }, orderBy: { nom: 'asc' } }),
    prisma.classeMatiere.findMany({ where: { classeId: classe.id } }),
    prisma.enseignantClasseMatiere.findMany({
      where: { classeId: classe.id },
      include: {
        enseignant: { include: { utilisateur: { select: { id: true, nom: true } } } },
        _count: { select: { notes: true, lecons: true } }
      }
    })
  ])

  const coefParMatiere = new Map(programme.map(p => [p.matiereId, p.coefficient]))
  const affectationsParMatiere = new Map()
  affectations.forEach(a => {
    if (!affectationsParMatiere.has(a.matiereId)) affectationsParMatiere.set(a.matiereId, [])
    affectationsParMatiere.get(a.matiereId).push(a)
  })

  const lignes = matieres.map(m => {
    const inclus = coefParMatiere.has(m.id)
    const affectationsMatiere = affectationsParMatiere.get(m.id) || []
    const principale = affectationsMatiere[0]
    return {
      matiereId: m.id,
      nom: m.nom,
      abreviation: m.abreviation,
      code: m.code,
      departement: m.departement,
      inclus,
      coefficient: inclus ? coefParMatiere.get(m.id) : 0,
      enseignantUtilisateurId: principale?.enseignant.utilisateur.id || '',
      enseignantNom: principale?.enseignant.utilisateur.nom || '',
      verrouille: affectationsMatiere.some(aDejaDuTravail)
    }
  })

  return {
    classe: { id: classe.id, nom: classe.nom, niveau: classe.niveau, ecoleId: classe.ecoleId, ecoleNom: classe.ecole.nomCourt },
    matieres: lignes,
    totalCoefficients: lignes.filter(l => l.inclus).reduce((somme, l) => somme + l.coefficient, 0)
  }
}

// GET PROGRAMME D'UNE CLASSE
router.get('/:classeId', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const classe = await chargerClasseAutorisee(req, req.params.classeId)
    res.json(await construireProgramme(req.prisma, classe))
  } catch (error) {
    res.status(error.statut || 500).json({ error: error.message })
  }
})

// ENREGISTRER LE PROGRAMME D'UNE CLASSE (Principal/Directrice, Super Admin)
// Reçoit la liste des matières COCHÉES ; toute matière absente de la liste est
// retirée du programme. Un enseignant ayant déjà saisi des notes ou des leçons
// n'est jamais retiré silencieusement (cascade) : l'opération est refusée.
router.put('/:classeId', verifyToken, checkRole(['PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const classe = await chargerClasseAutorisee(req, req.params.classeId)
    const demandees = req.body.matieres
    if (!Array.isArray(demandees)) throw new ErreurMetier('matieres (tableau) requis')

    const matieresEcole = await req.prisma.matiere.findMany({ where: { ecoleId: classe.ecoleId }, select: { id: true, nom: true } })
    const nomParId = new Map(matieresEcole.map(m => [m.id, m.nom]))

    const vues = new Set()
    for (const d of demandees) {
      if (!d.matiereId || !nomParId.has(d.matiereId)) {
        throw new ErreurMetier("Une matière n'appartient pas à l'école de cette classe")
      }
      if (vues.has(d.matiereId)) throw new ErreurMetier(`Matière en double : ${nomParId.get(d.matiereId)}`)
      vues.add(d.matiereId)

      const coefficient = Number(d.coefficient)
      if (!Number.isInteger(coefficient) || coefficient < 0 || coefficient > 100) {
        throw new ErreurMetier(`Coefficient invalide pour « ${nomParId.get(d.matiereId)} » (entier de 0 à 100)`)
      }
      d.coefficient = coefficient
    }

    await req.prisma.$transaction(async (tx) => {
      const programmeActuel = await tx.classeMatiere.findMany({ where: { classeId: classe.id } })
      const affectations = await tx.enseignantClasseMatiere.findMany({
        where: { classeId: classe.id },
        include: { enseignant: true, _count: { select: { notes: true, lecons: true } } }
      })
      const affectationsParMatiere = new Map()
      affectations.forEach(a => {
        if (!affectationsParMatiere.has(a.matiereId)) affectationsParMatiere.set(a.matiereId, [])
        affectationsParMatiere.get(a.matiereId).push(a)
      })

      // 1. Matières retirées du programme
      for (const ligne of programmeActuel) {
        if (vues.has(ligne.matiereId)) continue
        const affectationsMatiere = affectationsParMatiere.get(ligne.matiereId) || []
        if (affectationsMatiere.some(aDejaDuTravail)) {
          throw new ErreurMetier(`« ${nomParId.get(ligne.matiereId) || 'Matière'} » a déjà des notes ou des leçons saisies : impossible de la retirer du programme`, 409)
        }
        if (affectationsMatiere.length > 0) {
          await tx.enseignantClasseMatiere.deleteMany({ where: { id: { in: affectationsMatiere.map(a => a.id) } } })
        }
        await tx.classeMatiere.delete({ where: { id: ligne.id } })
      }

      // 2. Matières du programme : coefficient + enseignant
      for (const d of demandees) {
        await tx.classeMatiere.upsert({
          where: { classeId_matiereId: { classeId: classe.id, matiereId: d.matiereId } },
          create: { classeId: classe.id, matiereId: d.matiereId, coefficient: d.coefficient },
          update: { coefficient: d.coefficient }
        })

        const affectationsMatiere = affectationsParMatiere.get(d.matiereId) || []
        const utilisateurId = d.enseignantUtilisateurId || null

        if (!utilisateurId) {
          const supprimables = affectationsMatiere.filter(a => !aDejaDuTravail(a))
          if (supprimables.length > 0) {
            await tx.enseignantClasseMatiere.deleteMany({ where: { id: { in: supprimables.map(a => a.id) } } })
          }
          continue
        }

        if (!affectationsMatiere.some(a => a.enseignant.utilisateurId === utilisateurId)) {
          const utilisateur = await tx.utilisateur.findUnique({ where: { id: utilisateurId }, include: { enseignant: true } })
          if (!utilisateur || utilisateur.role !== 'ENSEIGNANT') {
            throw new ErreurMetier(`Enseignant invalide pour « ${nomParId.get(d.matiereId)} »`)
          }
          const rattache = await tx.utilisateurEcole.findFirst({ where: { utilisateurId, ecoleId: classe.ecoleId, actif: true } })
          if (!rattache) {
            throw new ErreurMetier(`${utilisateur.nom} n'est pas rattaché(e) à l'école ${classe.ecole.nomCourt}`)
          }
          const enseignant = utilisateur.enseignant
            || await tx.enseignant.create({ data: { utilisateurId, telephone: utilisateur.telephone || '' } })
          await tx.enseignantClasseMatiere.create({ data: { enseignantId: enseignant.id, classeId: classe.id, matiereId: d.matiereId } })
        }

        const autres = affectationsMatiere.filter(a => a.enseignant.utilisateurId !== utilisateurId && !aDejaDuTravail(a))
        if (autres.length > 0) {
          await tx.enseignantClasseMatiere.deleteMany({ where: { id: { in: autres.map(a => a.id) } } })
        }
      }
    }, { timeout: 30000, maxWait: 10000 })

    res.json(await construireProgramme(req.prisma, classe))
  } catch (error) {
    res.status(error.statut || 500).json({ error: error.message })
  }
})

export default router
