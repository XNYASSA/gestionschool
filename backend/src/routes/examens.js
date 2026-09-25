import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'
import { BAREME_APC_DEFAUT } from '../utils/baremeNotation.js'

const router = express.Router()

const ROLES_LECTURE = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']
const ROLES_BAREME = ['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']

class ErreurMetier extends Error {
  constructor(message, statut = 400) {
    super(message)
    this.statut = statut
  }
}

const reponseErreur = (res, error) => res.status(error.statut || 500).json({ error: error.message })

async function verifierEcole(req, ecoleId) {
  const ecole = ecoleId ? await req.prisma.ecole.findUnique({ where: { id: ecoleId } }) : null
  if (!ecole) throw new ErreurMetier('École non trouvée', 404)
  const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
  if (ecoleIds && !ecoleIds.includes(ecole.id)) throw new ErreurMetier("Cette école ne vous est pas affectée", 403)
  return ecole
}

async function chargerClasseAutorisee(req, classeId) {
  const classe = classeId ? await req.prisma.classe.findUnique({ where: { id: classeId }, include: { ecole: true } }) : null
  if (!classe) throw new ErreurMetier('Classe non trouvée', 404)
  await verifierEcole(req, classe.ecoleId)
  return classe
}

async function baremeEcole(prisma, ecoleId) {
  const lignes = await prisma.baremeNotation.findMany({ where: { ecoleId }, orderBy: { valMin: 'asc' } })
  if (lignes.length === 0) return { parDefaut: true, lignes: BAREME_APC_DEFAUT }
  return {
    parDefaut: false,
    lignes: lignes.map(l => ({ valMin: l.valMin, valMax: l.valMax, apc: l.apc, gpa: l.gpa, mentionFr: l.mentionFr, mentionEn: l.mentionEn }))
  }
}

const nombre = (valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const n = Number(String(valeur).replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function lireParametres(source) {
  const anneeScolaire = String(source.anneeScolaire || '')
  const trimestre = parseInt(source.trimestre)
  const evaluation = parseInt(source.evaluation)
  if (!/^\d{4}-\d{4}$/.test(anneeScolaire)) throw new ErreurMetier('Année scolaire invalide (ex : 2026-2027)')
  if (![1, 2, 3].includes(trimestre)) throw new ErreurMetier('Trimestre invalide (1, 2 ou 3)')
  if (![1, 2].includes(evaluation)) throw new ErreurMetier('Évaluation invalide (1 ou 2)')
  return { anneeScolaire, trimestre, evaluation }
}

// GET /bareme?ecoleId=... — barème de notation de l'école (APC par défaut s'il n'a pas été personnalisé)
router.get('/bareme', verifyToken, checkRole(ROLES_LECTURE), async (req, res) => {
  try {
    const ecole = await verifierEcole(req, req.query.ecoleId)
    res.json({ ecoleId: ecole.id, ...(await baremeEcole(req.prisma, ecole.id)) })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// PUT /bareme — remplace tout le barème de l'école
router.put('/bareme', verifyToken, checkRole(ROLES_BAREME), async (req, res) => {
  try {
    const ecole = await verifierEcole(req, req.body.ecoleId)
    const brutes = req.body.lignes
    if (!Array.isArray(brutes) || brutes.length === 0) throw new ErreurMetier('Le barème doit comporter au moins une ligne')

    const lignes = brutes.map((l, i) => {
      const valMin = nombre(l.valMin)
      const valMax = nombre(l.valMax)
      const gpa = nombre(l.gpa) ?? 0
      if (valMin === null || valMax === null || Number.isNaN(valMin) || Number.isNaN(valMax) || Number.isNaN(gpa)) {
        throw new ErreurMetier(`Ligne ${i + 1} : valeurs minimale et maximale numériques requises`)
      }
      if (valMin < 0 || valMax > 100 || valMin >= valMax) throw new ErreurMetier(`Ligne ${i + 1} : la valeur minimale doit être inférieure à la valeur maximale`)
      return { valMin, valMax, gpa, apc: String(l.apc ?? '').trim(), mentionFr: String(l.mentionFr ?? '').trim(), mentionEn: String(l.mentionEn ?? '').trim() }
    }).sort((a, b) => a.valMin - b.valMin)

    for (let i = 1; i < lignes.length; i++) {
      if (lignes[i].valMin < lignes[i - 1].valMax) {
        throw new ErreurMetier(`Les intervalles ${lignes[i - 1].valMin}–${lignes[i - 1].valMax} et ${lignes[i].valMin}–${lignes[i].valMax} se chevauchent`)
      }
    }

    await req.prisma.$transaction([
      req.prisma.baremeNotation.deleteMany({ where: { ecoleId: ecole.id } }),
      req.prisma.baremeNotation.createMany({ data: lignes.map(l => ({ ...l, ecoleId: ecole.id })) })
    ])
    res.json({ ecoleId: ecole.id, ...(await baremeEcole(req.prisma, ecole.id)) })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// DELETE /bareme?ecoleId=... — revient au barème APC par défaut
router.delete('/bareme', verifyToken, checkRole(ROLES_BAREME), async (req, res) => {
  try {
    const ecole = await verifierEcole(req, req.query.ecoleId)
    await req.prisma.baremeNotation.deleteMany({ where: { ecoleId: ecole.id } })
    res.json({ ecoleId: ecole.id, ...(await baremeEcole(req.prisma, ecole.id)) })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// GET /bordereau — élèves (ordre alphabétique) x matières du programme de la classe, avec les notes saisies
router.get('/bordereau', verifyToken, checkRole(ROLES_LECTURE), async (req, res) => {
  try {
    const classe = await chargerClasseAutorisee(req, req.query.classeId)
    const { anneeScolaire, trimestre, evaluation } = lireParametres(req.query)

    const [programme, eleves, affectations, bareme] = await Promise.all([
      req.prisma.classeMatiere.findMany({ where: { classeId: classe.id }, include: { matiere: true } }),
      req.prisma.eleve.findMany({
        where: { classeId: classe.id },
        select: { id: true, matricule: true, nom: true, prenom: true, sexe: true },
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
      }),
      req.prisma.enseignantClasseMatiere.findMany({
        where: { classeId: classe.id },
        include: { enseignant: { include: { utilisateur: { select: { nom: true } } } } }
      }),
      baremeEcole(req.prisma, classe.ecoleId)
    ])

    const notes = await req.prisma.noteEvaluation.findMany({
      where: { eleveId: { in: eleves.map(e => e.id) }, matiereId: { in: programme.map(p => p.matiereId) }, anneeScolaire, trimestre, evaluation }
    })
    const notesParEleve = new Map()
    notes.forEach(n => {
      if (!notesParEleve.has(n.eleveId)) notesParEleve.set(n.eleveId, {})
      notesParEleve.get(n.eleveId)[n.matiereId] = n.valeur
    })
    const validation = { total: notes.length, valides: notes.filter(n => n.statutValidation === 'VALIDE').length }
    const enseignantParMatiere = new Map()
    affectations.forEach(a => { if (!enseignantParMatiere.has(a.matiereId)) enseignantParMatiere.set(a.matiereId, a.enseignant.utilisateur.nom) })

    const matieres = programme
      .map(p => ({
        matiereId: p.matiereId,
        nom: p.matiere.nom,
        abreviation: p.matiere.abreviation || p.matiere.nom.slice(0, 4).toUpperCase(),
        coefficient: p.coefficient,
        enseignant: enseignantParMatiere.get(p.matiereId) || null
      }))
      .sort((a, b) => a.abreviation.localeCompare(b.abreviation) || a.nom.localeCompare(b.nom))

    res.json({
      classe: { id: classe.id, nom: classe.nom, niveau: classe.niveau, ecoleId: classe.ecoleId, ecole: classe.ecole.nomCourt },
      anneeScolaire, trimestre, evaluation,
      matieres,
      eleves: eleves.map(e => ({ ...e, notes: notesParEleve.get(e.id) || {} })),
      validation,
      bareme
    })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// PUT /bordereau — enregistre les notes modifiées ; une note vide (null) efface la note existante
router.put('/bordereau', verifyToken, checkRole(ROLES_LECTURE), async (req, res) => {
  try {
    const classe = await chargerClasseAutorisee(req, req.body.classeId)
    const { anneeScolaire, trimestre, evaluation } = lireParametres(req.body)
    const saisies = req.body.notes
    if (!Array.isArray(saisies) || saisies.length === 0) throw new ErreurMetier('Aucune note à enregistrer')
    if (saisies.length > 5000) throw new ErreurMetier('Trop de notes envoyées en une fois')

    const [eleves, programme] = await Promise.all([
      req.prisma.eleve.findMany({ where: { classeId: classe.id }, select: { id: true } }),
      req.prisma.classeMatiere.findMany({ where: { classeId: classe.id }, select: { matiereId: true } })
    ])
    const elevesValides = new Set(eleves.map(e => e.id))
    const matieresValides = new Set(programme.map(p => p.matiereId))

    const operations = []
    let enregistrees = 0
    let effacees = 0
    saisies.forEach((s, i) => {
      if (!elevesValides.has(s.eleveId)) throw new ErreurMetier(`Note ${i + 1} : élève absent de cette classe`)
      if (!matieresValides.has(s.matiereId)) throw new ErreurMetier(`Note ${i + 1} : matière absente du programme de cette classe`)
      const valeur = nombre(s.valeur)
      const cle = { eleveId: s.eleveId, matiereId: s.matiereId, anneeScolaire, trimestre, evaluation }

      if (valeur === null) {
        effacees++
        operations.push(req.prisma.noteEvaluation.deleteMany({ where: cle }))
        return
      }
      if (Number.isNaN(valeur) || valeur < 0 || valeur > 20) throw new ErreurMetier(`Note ${i + 1} : la note doit être comprise entre 0 et 20`)
      enregistrees++
      const arrondie = Math.round(valeur * 100) / 100
      operations.push(req.prisma.noteEvaluation.upsert({
        where: { eleveId_matiereId_anneeScolaire_trimestre_evaluation: cle },
        create: { ...cle, valeur: arrondie, saisiePar: req.user.id },
        // Une note modifiée doit être revalidée
        update: { valeur: arrondie, saisiePar: req.user.id, statutValidation: 'BROUILLON', dateValidation: null, validePar: null }
      }))
    })

    await req.prisma.$transaction(operations)
    res.json({ enregistrees, effacees })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// POST /bordereau/valider — valide toutes les notes saisies du bordereau (classe, année, trimestre, évaluation)
router.post('/bordereau/valider', verifyToken, checkRole(ROLES_LECTURE), async (req, res) => {
  try {
    const classe = await chargerClasseAutorisee(req, req.body.classeId)
    const { anneeScolaire, trimestre, evaluation } = lireParametres(req.body)
    const eleves = await req.prisma.eleve.findMany({ where: { classeId: classe.id }, select: { id: true } })
    const resultat = await req.prisma.noteEvaluation.updateMany({
      where: { eleveId: { in: eleves.map(e => e.id) }, anneeScolaire, trimestre, evaluation, statutValidation: { not: 'VALIDE' } },
      data: { statutValidation: 'VALIDE', dateValidation: new Date(), validePar: req.user.id }
    })
    res.json({ validees: resultat.count })
  } catch (error) {
    reponseErreur(res, error)
  }
})

// POST /bordereau/rouvrir — remet les notes en « à valider » (correction après validation) : responsables uniquement
router.post('/bordereau/rouvrir', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const classe = await chargerClasseAutorisee(req, req.body.classeId)
    const { anneeScolaire, trimestre, evaluation } = lireParametres(req.body)
    const eleves = await req.prisma.eleve.findMany({ where: { classeId: classe.id }, select: { id: true } })
    const resultat = await req.prisma.noteEvaluation.updateMany({
      where: { eleveId: { in: eleves.map(e => e.id) }, anneeScolaire, trimestre, evaluation },
      data: { statutValidation: 'BROUILLON', dateValidation: null, validePar: null }
    })
    res.json({ rouvertes: resultat.count })
  } catch (error) {
    reponseErreur(res, error)
  }
})

export default router
