// Vérifier que l'utilisateur a accès à une école spécifique
export async function checkEcoleAccess(req, res, next) {
  try {
    const ecoleId = req.params.ecoleId || req.body.ecoleId || req.query.ecoleId
    if (!ecoleId) {
      return res.status(400).json({ error: 'ecoleId manquant' })
    }

    // Super Admin accès à tout
    if (req.user.role === 'SUPER_ADMIN') {
      return next()
    }

    // Vérifier que l'utilisateur a accès à cette école
    const access = await req.prisma.utilisateurEcole.findFirst({
      where: {
        utilisateurId: req.user.id,
        ecoleId: ecoleId,
        actif: true
      }
    })

    if (!access) {
      return res.status(403).json({ error: 'Accès refusé à cette école' })
    }

    req.ecoleRole = access.role
    next()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
