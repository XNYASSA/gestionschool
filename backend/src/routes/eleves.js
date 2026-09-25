import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'
import { creerInscriptionsFraisPourEleve, synchroniserPaiementsCibles } from '../utils/inscriptionsFrais.js'

// Valeur enregistrée quand un fichier importé ne fournit pas le parent ou son téléphone : l'élève
// est créé quand même et l'écran le signale en rouge jusqu'à ce que l'information soit ajoutée.
const NON_RENSEIGNE = 'Non renseigné'

const LIBELLES_POSTES = { inscription: 'Inscription', tranche1: 'Tranche 1', tranche2: 'Tranche 2', tranche3: 'Tranche 3' }
const texteExces = (exces) => exces.length === 0
  ? ''
  : ` — attention : ${exces.map(e => `${e.montant.toLocaleString('fr-FR')} FCFA de ${LIBELLES_POSTES[e.tranche]} dépassent le montant dû`).join(', ')}`

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
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
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
    if (!nom || !prenom || !classeId || !nomParent || !telephoneParent) {
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
        sexe: sexe || null,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
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
        const { matricule: matriculeFourni, nom, prenom, sexe, dateNaissance, classe, nomParent, lieuParente, telephoneParent, emailParent, adresseParent, inscription, tranche1, tranche2, tranche3 } = ligne
        const montantsPostes = { inscription, tranche1, tranche2, tranche3 }

        if (!nom || !classe) {
          throw new Error('Nom et classe requis pour créer un élève')
        }
        const parentFourni = String(nomParent ?? '').trim()
        const telephoneFourni = String(telephoneParent ?? '').trim()
        const infosManquantes = [!String(prenom ?? '').trim() && 'prénom', !parentFourni && 'nom du parent', !telephoneFourni && 'téléphone du parent'].filter(Boolean)

        let sexeNormalise = null
        if (sexe) {
          sexeNormalise = /^m/i.test(String(sexe).trim()) ? 'MASCULIN' : /^f/i.test(String(sexe).trim()) ? 'FEMININ' : null
          if (!sexeNormalise) {
            throw new Error(`Sexe invalide : "${sexe}" (attendu M ou F)`)
          }
        }

        const classeTrouvee = classeParNom.get(String(classe).trim().toLowerCase())
        if (!classeTrouvee) {
          throw new Error(`Classe "${classe}" introuvable dans cette école`)
        }

        let dateNaissanceParsed = null
        if (dateNaissance) {
          dateNaissanceParsed = new Date(dateNaissance)
          if (isNaN(dateNaissanceParsed.getTime())) {
            throw new Error(`Date de naissance invalide : "${dateNaissance}"`)
          }
        }

        const nomTrim = String(nom).trim()
        const prenomTrim = String(prenom ?? '').trim()
        const matriculeFourniTrim = matriculeFourni ? String(matriculeFourni).trim() : ''

        // Reconnaît un élève déjà importé (même nom + prénom + classe) pour le
        // mettre à jour au lieu de le dupliquer — le fichier de la secrétaire
        // grossit au fil de l'année et est réimporté en entier à chaque fois.
        const eleveExistant = await req.prisma.eleve.findFirst({
          where: { classeId: classeTrouvee.id, nom: nomTrim, prenom: prenomTrim }
        })

        // Un matricule déjà porté par un autre élève (les numéros des fichiers ne sont pas uniques
        // entre sections) reçoit un suffixe plutôt que de bloquer l'import de l'élève.
        let matriculeRetenu = matriculeFourniTrim
        let noteMatricule = ''
        if (matriculeRetenu && eleveExistant && matriculeRetenu !== eleveExistant.matricule && matriculesExistants.has(matriculeRetenu)) {
          matriculeRetenu = '' // l'élève garde son matricule actuel
        } else if (matriculeRetenu && !eleveExistant && matriculesExistants.has(matriculeRetenu)) {
          let suffixe = 2
          while (matriculesExistants.has(`${matriculeFourniTrim}-${suffixe}`)) suffixe++
          matriculeRetenu = `${matriculeFourniTrim}-${suffixe}`
          noteMatricule = ` — matricule « ${matriculeFourniTrim} » déjà pris, enregistré « ${matriculeRetenu} »`
        }
        const texteManquants = infosManquantes.length ? ` — à compléter : ${infosManquantes.join(', ')}` : ''

        if (eleveExistant) {
          const eleve = await req.prisma.eleve.update({
            where: { id: eleveExistant.id },
            data: {
              ...(matriculeRetenu && { matricule: matriculeRetenu }),
              ...(sexeNormalise && { sexe: sexeNormalise }),
              ...(dateNaissanceParsed && { dateNaissance: dateNaissanceParsed }),
              ...(parentFourni && { nomParent: parentFourni }),
              ...(lieuParente && { lieuParente }),
              ...(telephoneFourni && { telephoneParent: telephoneFourni }),
              ...(emailParent && { emailParent }),
              ...(adresseParent && { adresseParent })
            }
          })
          if (matriculeRetenu) {
            matriculesExistants.delete(eleveExistant.matricule)
            matriculesExistants.add(eleve.matricule)
          }

          const { exces } = await synchroniserPaiementsCibles(req.prisma, eleve.id, montantsPostes)

          resultats.push({
            ligne: numeroLigne,
            succes: true,
            infosManquantes: infosManquantes.length > 0 && (!parentFourni && eleveExistant.nomParent === NON_RENSEIGNE || !telephoneFourni && eleveExistant.telephoneParent === NON_RENSEIGNE || !prenomTrim),
            message: `${prenomTrim} ${nomTrim} (${eleve.matricule}) mis à jour${noteMatricule}${texteExces(exces)}`
          })
          continue
        }

        let matricule
        if (matriculeRetenu) {
          matricule = matriculeRetenu
        } else {
          do {
            matricule = `MAT${String(prochainNumero).padStart(3, '0')}`
            prochainNumero++
          } while (matriculesExistants.has(matricule))
        }
        matriculesExistants.add(matricule)

        const eleve = await req.prisma.eleve.create({
          data: {
            matricule,
            nom: nomTrim,
            prenom: prenomTrim,
            sexe: sexeNormalise,
            dateNaissance: dateNaissanceParsed,
            classeId: classeTrouvee.id,
            nomParent: parentFourni || NON_RENSEIGNE,
            lieuParente: lieuParente || null,
            telephoneParent: telephoneFourni || NON_RENSEIGNE,
            emailParent: emailParent || null,
            adresseParent: adresseParent || null
          }
        })

        const postesFrais = await creerInscriptionsFraisPourEleve(req.prisma, eleve.id, ecoleId, classeTrouvee.niveau)
        const { exces } = await synchroniserPaiementsCibles(req.prisma, eleve.id, montantsPostes)

        resultats.push({
          ligne: numeroLigne,
          succes: true,
          infosManquantes: infosManquantes.length > 0,
          sansBareme: postesFrais.length === 0,
          message: postesFrais.length === 0
            ? `${prenomTrim} ${nomTrim} (${matricule}) créé(e) — aucun barème de frais pour le niveau "${classeTrouvee.niveau}"${texteManquants}`
            : `${prenomTrim} ${nomTrim} (${matricule}) créé(e)${noteMatricule}${texteExces(exces)}${texteManquants}`
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
