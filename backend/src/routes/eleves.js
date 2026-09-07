import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'
import { creerInscriptionsFraisPourEleve } from '../utils/inscriptionsFrais.js'

const router = express.Router()

// GET ALL ELEVES — limité aux écoles affectées pour les non-admin
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ECONOMAT', 'ENSEIGNANT', 'SURVEILLANT_GENERAL']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const eleves = await req.prisma.eleve.findMany({
      where: ecoleIds ? { classe: { ecoleId: { in: ecoleIds } } } : {},
      include: {
        classe: { include: { ecole: true } },
        inscriptionsFrais: { select: { tranche: true, montantDu: true, montantPaye: true, statut: true } }
      }
    })
    res.json(eleves)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET ELEVE BY ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const eleve = await req.prisma.eleve.findUnique({
      where: { id: req.params.id },
      include: { classe: { include: { ecole: true } } }
    })
    if (!eleve) return res.status(404).json({ error: 'Élève non trouvé' })
    res.json(eleve)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE ELEVE (Super Admin, Principal/Directrice, Secretaire)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    let { matricule, nom, prenom, sexe, dateNaissance, classeId, nomParent, lieuParente, telephoneParent, emailParent, adresseParent } = req.body

    // Valider les champs requis
    if (!nom || !prenom || !sexe || !dateNaissance || !classeId || !nomParent || !telephoneParent) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' })
    }

    // Vérifier que la classe appartient bien à une école affectée à l'appelant (sauf Super Admin)
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const classe = await req.prisma.classe.findUnique({ where: { id: classeId } })
      if (!classe || !ecoleIds.includes(classe.ecoleId)) {
        return res.status(403).json({ error: 'Cette classe n\'appartient pas à une école qui vous est affectée' })
      }
    }

    // Si matricule vide, générer un matricule unique
    if (!matricule || matricule.trim() === '') {
      let maxNum = 0
      const allEleves = await req.prisma.eleve.findMany({ select: { matricule: true } })

      // Extraire les numéros des matricules existants (ex: "MAT001" → 1)
      allEleves.forEach(e => {
        const match = e.matricule.match(/\d+/)
        if (match) {
          const num = parseInt(match[0])
          if (num > maxNum) maxNum = num
        }
      })

      // Générer le prochain matricule unique
      matricule = `MAT${String(maxNum + 1).padStart(3, '0')}`
    } else {
      // Si matricule fourni, vérifier qu'il n'existe pas
      const existing = await req.prisma.eleve.findUnique({
        where: { matricule }
      })

      if (existing) {
        return res.status(400).json({ error: `Matricule ${matricule} déjà utilisé` })
      }
    }

    const eleve = await req.prisma.eleve.create({
      data: {
        matricule,
        nom,
        prenom,
        sexe,
        dateNaissance: new Date(dateNaissance),
        classeId,
        nomParent,
        lieuParente,
        telephoneParent,
        emailParent,
        adresseParent
      },
      include: { classe: true }
    })

    const postesFrais = await creerInscriptionsFraisPourEleve(req.prisma, eleve.id, eleve.classe.ecoleId, eleve.classe.niveau)

    res.status(201).json({
      ...eleve,
      ...(postesFrais.length === 0 && { avertissement: 'Aucun barème de frais configuré pour ce niveau — pensez à en créer un dans Configuration des frais.' })
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// IMPORT EN MASSE (Super Admin, Principal/Directrice, Secretaire) — depuis un fichier
// préparé par la secrétaire ; chaque ligne est traitée indépendamment, une ligne en
// erreur n'interrompt pas l'import des autres.
router.post('/import', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE', 'ECONOMAT']), async (req, res) => {
  try {
    const { ecoleId, lignes } = req.body

    if (!ecoleId || !Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'ecoleId et lignes (tableau non vide) requis' })
    }

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(ecoleId)) {
      return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
    }

    const classesEcole = await req.prisma.classe.findMany({ where: { ecoleId } })
    const classeParNom = new Map(classesEcole.map(c => [c.nom.trim().toLowerCase(), c]))

    const elevesExistants = await req.prisma.eleve.findMany({ select: { matricule: true } })
    let prochainNumero = 1
    elevesExistants.forEach(e => {
      const match = e.matricule.match(/\d+/)
      if (match) prochainNumero = Math.max(prochainNumero, parseInt(match[0]) + 1)
    })
    const matriculesExistants = new Set(elevesExistants.map(e => e.matricule))

    const resultats = []

    for (let i = 0; i < lignes.length; i++) {
      const numeroLigne = i + 1
      const ligne = lignes[i] || {}
      try {
        const { nom, prenom, sexe, dateNaissance, classe, nomParent, lieuParente, telephoneParent, emailParent, adresseParent, montantDejaVerse } = ligne

        if (!nom || !prenom || !sexe || !dateNaissance || !classe || !nomParent || !telephoneParent) {
          throw new Error('Champs obligatoires manquants (nom, prénom, sexe, date de naissance, classe, nom du parent, téléphone du parent)')
        }

        const sexeNormalise = /^m/i.test(String(sexe).trim()) ? 'MASCULIN' : /^f/i.test(String(sexe).trim()) ? 'FEMININ' : null
        if (!sexeNormalise) {
          throw new Error(`Sexe invalide : "${sexe}" (attendu M ou F)`)
        }

        const classeTrouvee = classeParNom.get(String(classe).trim().toLowerCase())
        if (!classeTrouvee) {
          throw new Error(`Classe "${classe}" introuvable dans cette école`)
        }

        const dateNaissanceParsed = new Date(dateNaissance)
        if (isNaN(dateNaissanceParsed.getTime())) {
          throw new Error(`Date de naissance invalide : "${dateNaissance}"`)
        }

        let matricule
        do {
          matricule = `MAT${String(prochainNumero).padStart(3, '0')}`
          prochainNumero++
        } while (matriculesExistants.has(matricule))
        matriculesExistants.add(matricule)

        const eleve = await req.prisma.eleve.create({
          data: {
            matricule,
            nom,
            prenom,
            sexe: sexeNormalise,
            dateNaissance: dateNaissanceParsed,
            classeId: classeTrouvee.id,
            nomParent,
            lieuParente: lieuParente || null,
            telephoneParent,
            emailParent: emailParent || null,
            adresseParent: adresseParent || null
          }
        })

        const postesFrais = await creerInscriptionsFraisPourEleve(req.prisma, eleve.id, ecoleId, classeTrouvee.niveau, parseInt(montantDejaVerse) || 0)

        resultats.push({
          ligne: numeroLigne,
          succes: true,
          message: postesFrais.length === 0
            ? `${prenom} ${nom} (${matricule}) créé(e) — aucun barème de frais pour le niveau "${classeTrouvee.niveau}"`
            : `${prenom} ${nom} (${matricule}) créé(e)`
        })
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

// UPDATE ELEVE (Super Admin, Principal/Directrice, Secretaire)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { nom, prenom, sexe, dateNaissance, classeId, nomParent, lieuParente, telephoneParent, emailParent, adresseParent } = req.body

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds) {
      const eleveActuel = await req.prisma.eleve.findUnique({ where: { id: req.params.id }, include: { classe: true } })
      if (!eleveActuel || !ecoleIds.includes(eleveActuel.classe.ecoleId)) {
        return res.status(403).json({ error: 'Accès refusé à cet élève' })
      }
      if (classeId) {
        const nouvelleClasse = await req.prisma.classe.findUnique({ where: { id: classeId } })
        if (!nouvelleClasse || !ecoleIds.includes(nouvelleClasse.ecoleId)) {
          return res.status(403).json({ error: 'Cette classe n\'appartient pas à une école qui vous est affectée' })
        }
      }
    }

    const eleve = await req.prisma.eleve.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(prenom && { prenom }),
        ...(sexe && { sexe }),
        ...(dateNaissance && { dateNaissance: new Date(dateNaissance) }),
        ...(classeId && { classeId }),
        ...(nomParent && { nomParent }),
        ...(lieuParente !== undefined && { lieuParente }),
        ...(telephoneParent && { telephoneParent }),
        ...(emailParent !== undefined && { emailParent }),
        ...(adresseParent !== undefined && { adresseParent })
      },
      include: { classe: { include: { ecole: true } } }
    })
    res.json(eleve)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Élève non trouvé' })
    }
    res.status(400).json({ error: error.message })
  }
})

// DELETE ELEVE (Proprietaire only)
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    // Supprimer les frais liés
    await req.prisma.inscriptionFrais.deleteMany({
      where: { eleveId: req.params.id }
    })

    // Supprimer les notes
    await req.prisma.note.deleteMany({
      where: { eleveId: req.params.id }
    })

    // Supprimer les présences
    await req.prisma.presence.deleteMany({
      where: { eleveId: req.params.id }
    })

    // Supprimer l'élève
    await req.prisma.eleve.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Élève supprimé avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Élève non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
