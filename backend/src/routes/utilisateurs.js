import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getEcoleIdsScope } from '../utils/ecoleScope.js'

const router = express.Router()

// Vérifie que l'admin appelant confirme bien sa propre identité (email + mot de passe)
// avant une action sensible sur un autre compte (réinitialisation, connexion en tant que).
async function verifierReauthentificationAdmin(prisma, req) {
  const { adminEmail, adminMotDePasse } = req.body
  if (!adminEmail || !adminMotDePasse) {
    return { error: 'Veuillez confirmer votre email et votre mot de passe' }
  }
  if (adminEmail !== req.user.email) {
    return { error: 'Identifiants incorrects' }
  }
  const admin = await prisma.utilisateur.findUnique({ where: { id: req.user.id } })
  const valide = admin && await bcryptjs.compare(adminMotDePasse, admin.motDePasse)
  if (!valide) {
    return { error: 'Identifiants incorrects' }
  }
  return {}
}

// Rôles qu'un Principal/Directrice (non Super Admin) peut créer/assigner — pas de gestion des comptes admin
const ROLES_ASSIGNABLES_NON_ADMIN = ['SECRETAIRE', 'ENSEIGNANT', 'ECONOMAT', 'SURVEILLANT_GENERAL', 'PERSONNEL']

// Un membre du personnel peut être enregistré sans email ni mot de passe (aucun champ
// n'est obligatoire). Il reçoit alors un email technique et un mot de passe aléatoire
// jamais communiqué : le compte existe (affectations, salaire, listes) mais personne
// ne peut s'y connecter tant qu'un vrai email et un mot de passe n'ont pas été saisis.
const DOMAINE_SANS_CONNEXION = '@personnel.local'
const estSansConnexion = (email) => String(email || '').toLowerCase().endsWith(DOMAINE_SANS_CONNEXION)
const emailSansConnexion = () => `sans-connexion-${crypto.randomBytes(6).toString('hex')}${DOMAINE_SANS_CONNEXION}`
const motDePasseInutilisable = () => bcryptjs.hash(crypto.randomBytes(24).toString('hex'), 4)
const texte = (valeur) => (valeur === undefined || valeur === null ? '' : String(valeur).trim())

const normaliserTexte = (valeur) => texte(valeur)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Clé de comparaison de deux noms : sans accents ni casse ni ponctuation, et sans
// tenir compte de l'ordre des mots ("Nom Prénom" ou "Prénom Nom").
const cleNom = (nom) => normaliserTexte(nom).split(' ').filter(Boolean).sort().join(' ')

// Libellés de rôle acceptés dans un fichier d'import (comparés sans accents ni casse)
const ROLES_IMPORT = {
  enseignant: 'ENSEIGNANT', enseignante: 'ENSEIGNANT', 'enseignant e': 'ENSEIGNANT', professeur: 'ENSEIGNANT', prof: 'ENSEIGNANT',
  secretaire: 'SECRETAIRE',
  economat: 'ECONOMAT', econome: 'ECONOMAT', economie: 'ECONOMAT',
  'surveillant general': 'SURVEILLANT_GENERAL', 'surveillante generale': 'SURVEILLANT_GENERAL', sg: 'SURVEILLANT_GENERAL',
  personnel: 'PERSONNEL', 'autre personnel administratif': 'PERSONNEL', 'personnel administratif': 'PERSONNEL', autre: 'PERSONNEL',
  principal: 'PRINCIPAL', principale: 'PRINCIPAL', directrice: 'DIRECTRICE', directeur: 'DIRECTRICE',
  censeur: 'PERSONNEL', 'prefet des etudes': 'PERSONNEL', 'prefet etudes': 'PERSONNEL',
  'secretaire general': 'PERSONNEL', intendant: 'PERSONNEL'
}

const publicSelect = {
  id: true,
  nom: true,
  email: true,
  role: true,
  fonction: true,
  telephone: true,
  salaireMensuel: true,
  actif: true,
  createdAt: true,
  updatedAt: true,
  utilisateurEcoles: {
    where: { actif: true },
    select: {
      id: true,
      role: true,
      ecole: { select: { id: true, nomCourt: true, nomComplet: true } }
    }
  },
  enseignant: { select: { tarifHoraire: true } }
}

// GET - Lister le personnel (Super Admin : tout le monde ; Principal/Directrice/Secrétaire : personnel de leur(s) école(s) uniquement)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)

    const utilisateurs = await req.prisma.utilisateur.findMany({
      where: ecoleIds ? { utilisateurEcoles: { some: { ecoleId: { in: ecoleIds }, actif: true } } } : {},
      select: publicSelect,
      orderBy: { createdAt: 'desc' }
    })
    res.json(utilisateurs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Obtenir un utilisateur par ID
router.get('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id },
      select: publicSelect
    })
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Masse salariale (salaires mensuels du personnel actif) d'une école
router.get('/ecole/:ecoleId/masse-salariale', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(req.params.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const utilisateurs = await req.prisma.utilisateur.findMany({
      where: {
        actif: true,
        salaireMensuel: { not: null },
        utilisateurEcoles: { some: { ecoleId: req.params.ecoleId, actif: true } }
      },
      select: { id: true, nom: true, role: true, salaireMensuel: true }
    })

    const total = utilisateurs.reduce((sum, u) => sum + (u.salaireMensuel || 0), 0)

    res.json({ total, utilisateurs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET - Enseignants d'une école ayant un tarif horaire défini (pour le rapport financier)
router.get('/ecole/:ecoleId/enseignants-horaires', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(req.params.ecoleId)) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    const utilisateurs = await req.prisma.utilisateur.findMany({
      where: {
        role: 'ENSEIGNANT',
        actif: true,
        utilisateurEcoles: { some: { ecoleId: req.params.ecoleId, actif: true } },
        enseignant: { tarifHoraire: { not: null } }
      },
      select: { id: true, nom: true, enseignant: { select: { tarifHoraire: true } } }
    })

    res.json(utilisateurs.map(u => ({ utilisateurId: u.id, nom: u.nom, tarifHoraire: u.enseignant.tarifHoraire })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Définir le tarif horaire d'un enseignant (Super Admin, ou Principal/Directrice de son école)
router.put('/:id/tarif-horaire', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE']), async (req, res) => {
  try {
    const { tarifHoraire } = req.body
    const valeur = tarifHoraire === null || tarifHoraire === '' ? null : parseInt(tarifHoraire)

    if (valeur !== null && (isNaN(valeur) || valeur < 0)) {
      return res.status(400).json({ error: 'tarifHoraire doit être un entier positif ou null' })
    }

    const cible = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id },
      include: { enseignant: true, utilisateurEcoles: { where: { actif: true } } }
    })

    if (!cible || cible.role !== 'ENSEIGNANT') {
      return res.status(404).json({ error: 'Enseignant non trouvé' })
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
      if (!cible.utilisateurEcoles.some(ue => ecoleIds.includes(ue.ecoleId))) {
        return res.status(403).json({ error: 'Accès refusé à cet enseignant' })
      }
    }

    const enseignant = cible.enseignant
      ? await req.prisma.enseignant.update({ where: { id: cible.enseignant.id }, data: { tarifHoraire: valeur } })
      : await req.prisma.enseignant.create({ data: { utilisateurId: cible.id, telephone: cible.telephone || '', tarifHoraire: valeur } })

    res.json(enseignant)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Modifier son propre profil (l'utilisateur lui-même)
router.put('/profil/moi', verifyToken, async (req, res) => {
  try {
    const { nom, email } = req.body
    const userId = req.user.id

    const dataToUpdate = {}
    if (nom) dataToUpdate.nom = nom
    if (email) {
      // Vérifier que le nouvel email n'existe pas déjà
      const existingUser = await req.prisma.utilisateur.findUnique({
        where: { email }
      })
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
      dataToUpdate.email = email
    }

    const utilisateur = await req.prisma.utilisateur.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        nom: true,
        email: true,
        role: true
      }
    })

    res.json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Changer son mot de passe
router.put('/profil/changer-mot-de-passe', verifyToken, async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body
    const userId = req.user.id

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({
        error: 'Ancien et nouveau mot de passe requis'
      })
    }

    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: userId }
    })

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Vérifier l'ancien mot de passe
    const motDePasseValide = await bcryptjs.compare(ancienMotDePasse, utilisateur.motDePasse)
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' })
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcryptjs.hash(nouveauMotDePasse, 10)

    await req.prisma.utilisateur.update({
      where: { id: userId },
      data: { motDePasse: hashedPassword }
    })

    res.json({ message: 'Mot de passe modifié avec succès' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Créer un nouvel utilisateur / membre du personnel (Super Admin, ou Principal/Directrice/Secrétaire sans gestion des comptes admin)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { nom, email, motDePasse, role, fonction, telephone, salaireMensuel, ecoleId } = req.body

    // Aucun champ n'est obligatoire, mais on refuse une fiche entièrement vide (clic accidentel)
    if (![nom, email, motDePasse, fonction, telephone, salaireMensuel].some(v => texte(v))) {
      return res.status(400).json({ error: 'Renseignez au moins une information (nom, email, téléphone, fonction…)' })
    }

    const roleFinal = (texte(role) || 'ENSEIGNANT').toUpperCase()

    if (req.user.role !== 'SUPER_ADMIN' && !ROLES_ASSIGNABLES_NON_ADMIN.includes(roleFinal)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle' })
    }

    const emailSaisi = texte(email)
    if (estSansConnexion(emailSaisi)) {
      return res.status(400).json({ error: 'Adresse email non valide' })
    }
    if (emailSaisi) {
      const existingUser = await req.prisma.utilisateur.findUnique({ where: { email: emailSaisi } })
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
    }

    if (ecoleId) {
      const ecole = await req.prisma.ecole.findUnique({ where: { id: ecoleId } })
      if (!ecole) {
        return res.status(400).json({ error: 'École non trouvée' })
      }

      const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
      if (ecoleIds && !ecoleIds.includes(ecoleId)) {
        return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
      }
    }

    const hashedPassword = texte(motDePasse) ? await bcryptjs.hash(motDePasse, 10) : await motDePasseInutilisable()

    const utilisateur = await req.prisma.utilisateur.create({
      data: {
        nom: texte(nom) || 'Sans nom',
        email: emailSaisi || emailSansConnexion(),
        motDePasse: hashedPassword,
        role: roleFinal,
        fonction: fonction || null,
        telephone: telephone || null,
        salaireMensuel: salaireMensuel ? parseInt(salaireMensuel) : null,
        actif: true,
        ...(ecoleId && {
          utilisateurEcoles: {
            create: { ecoleId, role: roleFinal }
          }
        }),
        ...(roleFinal === 'ENSEIGNANT' && {
          enseignant: { create: { telephone: telephone || '' } }
        })
      },
      select: publicSelect
    })

    res.status(201).json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /import - Importer une liste du personnel (nom, prénom, fonction, téléphone) dans
// UNE école. Aucune colonne n'est obligatoire : seule une ligne entièrement vide est refusée.
// La fonction détermine le rôle (Enseignant, Secrétaire, Surveillant Général, Économat,
// Principal, Directrice) ; les autres fonctions (Censeur, Préfet des études...) sont des
// membres du personnel administratif, avec la fonction conservée telle que saisie.
// Chaque ligne est traitée indépendamment. Les comptes créés n'ont pas de connexion
// (voir DOMAINE_SANS_CONNEXION). Une personne déjà présente dans l'école (même nom,
// quel que soit l'ordre prénom/nom) est ignorée : on peut réimporter un fichier qui grossit.
router.post('/import', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { ecoleId, lignes } = req.body
    if (!ecoleId || !Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'ecoleId et lignes (tableau non vide) requis' })
    }

    const ecole = await req.prisma.ecole.findUnique({ where: { id: ecoleId } })
    if (!ecole) return res.status(400).json({ error: 'École non trouvée' })

    const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
    if (ecoleIds && !ecoleIds.includes(ecoleId)) {
      return res.status(403).json({ error: 'Cette école ne vous est pas affectée' })
    }

    const dejaPresents = await req.prisma.utilisateurEcole.findMany({
      where: { ecoleId, actif: true },
      include: { utilisateur: { select: { nom: true } } }
    })
    const clesPresentes = new Set(dejaPresents.map(ue => cleNom(ue.utilisateur.nom)))

    const resultats = []
    for (let i = 0; i < lignes.length; i++) {
      const numeroLigne = i + 1
      const ligne = lignes[i] || {}
      try {
        const nom = texte(ligne.nom)
        const prenom = texte(ligne.prenom)
        const fonction = texte(ligne.fonction ?? ligne.role)
        const telephone = texte(ligne.telephone)
        if (!nom && !prenom && !fonction && !telephone) throw new Error('Ligne vide')
        const nomComplet = `${nom} ${prenom}`.trim() || 'Sans nom'

        // Fonction vide = enseignant ; fonction inconnue = personnel administratif (fonction conservée)
        const roleFinal = fonction ? (ROLES_IMPORT[normaliserTexte(fonction)] || 'PERSONNEL') : 'ENSEIGNANT'
        if (req.user.role !== 'SUPER_ADMIN' && !ROLES_ASSIGNABLES_NON_ADMIN.includes(roleFinal)) {
          throw new Error(`Vous ne pouvez pas attribuer la fonction « ${fonction} »`)
        }

        // Sans nom ni prénom, impossible de reconnaître un doublon : la ligne est toujours créée
        const cle = cleNom(nomComplet)
        if ((nom || prenom) && clesPresentes.has(cle)) {
          resultats.push({ ligne: numeroLigne, statut: 'ignore', message: `${nomComplet} — déjà présent(e) dans cette école, ignoré(e)` })
          continue
        }

        await req.prisma.utilisateur.create({
          data: {
            nom: nomComplet,
            email: emailSansConnexion(),
            motDePasse: await motDePasseInutilisable(),
            role: roleFinal,
            fonction: fonction || null,
            telephone: telephone || null,
            actif: true,
            utilisateurEcoles: { create: { ecoleId, role: roleFinal } },
            ...(roleFinal === 'ENSEIGNANT' && { enseignant: { create: { telephone } } })
          }
        })
        if (nom || prenom) clesPresentes.add(cle)
        const inconnue = fonction && !ROLES_IMPORT[normaliserTexte(fonction)]
        resultats.push({ ligne: numeroLigne, statut: 'cree', message: `${nomComplet} — ajouté(e) (${fonction || 'Enseignant'}${inconnue ? ', enregistrée comme personnel administratif' : ''})` })
      } catch (err) {
        const personne = `${texte(ligne.nom)} ${texte(ligne.prenom)}`.trim()
        resultats.push({ ligne: numeroLigne, statut: 'erreur', message: personne ? `${personne} — ${err.message}` : err.message })
      }
    }

    const compter = (statut) => resultats.filter(r => r.statut === statut).length
    res.json({ total: lignes.length, crees: compter('cree'), ignores: compter('ignore'), erreurs: compter('erreur'), resultats })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Modifier un utilisateur / membre du personnel (Super Admin, ou Principal/Directrice/Secrétaire sur le personnel de leur école, sans gestion des comptes admin)
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN', 'PRINCIPAL', 'DIRECTRICE', 'SECRETAIRE']), async (req, res) => {
  try {
    const { nom, email, motDePasse, role, fonction, telephone, salaireMensuel } = req.body

    const cible = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id },
      include: { utilisateurEcoles: { where: { actif: true } } }
    })
    if (!cible) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    // Un compte sans connexion (créé sans email ni mot de passe) peut recevoir ses
    // identifiants de connexion, y compris d'un Principal : ce n'est pas un compte existant.
    const sansConnexion = estSansConnexion(cible.email)

    if (req.user.role !== 'SUPER_ADMIN') {
      const ecoleIds = await getEcoleIdsScope(req.prisma, req.user)
      if (!cible.utilisateurEcoles.some(ue => ecoleIds.includes(ue.ecoleId))) {
        return res.status(403).json({ error: 'Accès refusé à ce membre du personnel' })
      }
      if (role && !ROLES_ASSIGNABLES_NON_ADMIN.includes(role.toUpperCase())) {
        return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle' })
      }
      if (motDePasse && !sansConnexion) {
        return res.status(403).json({ error: 'Seul un administrateur peut modifier le mot de passe d\'un compte' })
      }
    }

    const dataToUpdate = {}
    if (sansConnexion && texte(email)) {
      const emailSaisi = texte(email)
      if (estSansConnexion(emailSaisi)) {
        return res.status(400).json({ error: 'Adresse email non valide' })
      }
      const dejaPris = await req.prisma.utilisateur.findUnique({ where: { email: emailSaisi } })
      if (dejaPris && dejaPris.id !== cible.id) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
      dataToUpdate.email = emailSaisi
    }
    if (nom) dataToUpdate.nom = nom
    if (role) dataToUpdate.role = role.toUpperCase()
    if (fonction !== undefined) dataToUpdate.fonction = fonction || null
    if (telephone !== undefined) dataToUpdate.telephone = telephone || null
    if (salaireMensuel !== undefined) dataToUpdate.salaireMensuel = salaireMensuel ? parseInt(salaireMensuel) : null
    if (motDePasse) {
      dataToUpdate.motDePasse = await bcryptjs.hash(motDePasse, 10)
    }

    const utilisateur = await req.prisma.utilisateur.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      select: publicSelect
    })

    res.json(utilisateur)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

// PUT - Suspendre/Activer un utilisateur (contrôle l'accès à l'application)
router.put('/:id/toggle-statut', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateur = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id }
    })

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const updatedUser = await req.prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { actif: !utilisateur.actif },
      select: publicSelect
    })

    res.json({
      ...updatedUser,
      message: updatedUser.actif ? 'Compte activé : accès à l\'application rétabli' : 'Compte suspendu : accès à l\'application bloqué'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Réinitialiser le mot de passe d'un compte (Super Admin, après ré-authentification)
router.post('/:id/reset-password', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { error } = await verifierReauthentificationAdmin(req.prisma, req)
    if (error) return res.status(401).json({ error })

    const cible = await req.prisma.utilisateur.findUnique({ where: { id: req.params.id } })
    if (!cible) return res.status(404).json({ error: 'Utilisateur non trouvé' })

    const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url')
    const hashedPassword = await bcryptjs.hash(motDePasseTemporaire, 10)

    await req.prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { motDePasse: hashedPassword }
    })

    res.json({ motDePasseTemporaire })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST - Se connecter en tant qu'un autre compte (Super Admin, après ré-authentification)
router.post('/:id/impersonate', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { error } = await verifierReauthentificationAdmin(req.prisma, req)
    if (error) return res.status(401).json({ error })

    const cible = await req.prisma.utilisateur.findUnique({ where: { id: req.params.id } })
    if (!cible) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    if (!cible.actif) return res.status(403).json({ error: 'Ce compte est suspendu' })

    const utilisateurEcoles = await req.prisma.utilisateurEcole.findMany({
      where: { utilisateurId: cible.id, actif: true },
      include: { ecole: true }
    })

    const token = jwt.sign(
      {
        id: cible.id,
        email: cible.email,
        role: cible.role,
        nom: cible.nom,
        ecoles: utilisateurEcoles.map(ue => ({ ecoleId: ue.ecoleId, role: ue.role }))
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.json({
      token,
      utilisateur: {
        id: cible.id,
        nom: cible.nom,
        email: cible.email,
        role: cible.role,
        ecoles: utilisateurEcoles.map(ue => ({
          id: ue.ecole.id,
          nomCourt: ue.ecole.nomCourt,
          nomComplet: ue.ecole.nomComplet,
          role: ue.role
        }))
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE - Supprimer un utilisateur (Admin uniquement)
router.delete('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    // Supprimer les données associées
    const user = await req.prisma.utilisateur.findUnique({
      where: { id: req.params.id },
      include: { enseignant: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Si c'est un enseignant, supprimer ses associations
    if (user.enseignant) {
      await req.prisma.enseignantClasseMatiere.deleteMany({
        where: { enseignantId: user.enseignant.id }
      })
      await req.prisma.enseignant.delete({
        where: { id: user.enseignant.id }
      })
    }

    // Supprimer l'utilisateur
    await req.prisma.utilisateur.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Utilisateur supprimé avec succès' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
