import express from 'express'
import { verifyToken, checkRole } from '../middleware/auth.js'
import bcryptjs from 'bcryptjs'

const router = express.Router()

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
  }
}

// GET - Lister tous les utilisateurs, actifs et inactifs (Admin uniquement)
router.get('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const utilisateurs = await req.prisma.utilisateur.findMany({
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

// POST - Créer un nouvel utilisateur / membre du personnel (Admin uniquement)
router.post('/', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, email, motDePasse, role, fonction, telephone, salaireMensuel, ecoleId } = req.body

    if (!nom || !email || !motDePasse || !role) {
      return res.status(400).json({
        error: 'Champs obligatoires: nom, email, motDePasse, role'
      })
    }

    const existingUser = await req.prisma.utilisateur.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    if (ecoleId) {
      const ecole = await req.prisma.ecole.findUnique({ where: { id: ecoleId } })
      if (!ecole) {
        return res.status(400).json({ error: 'École non trouvée' })
      }
    }

    const hashedPassword = await bcryptjs.hash(motDePasse, 10)
    const roleFinal = role.toUpperCase()

    const utilisateur = await req.prisma.utilisateur.create({
      data: {
        nom,
        email,
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
        })
      },
      select: publicSelect
    })

    res.status(201).json(utilisateur)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT - Modifier un utilisateur / membre du personnel
router.put('/:id', verifyToken, checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { nom, motDePasse, role, fonction, telephone, salaireMensuel } = req.body

    const dataToUpdate = {}
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
