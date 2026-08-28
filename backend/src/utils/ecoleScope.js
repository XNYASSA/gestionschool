// Retourne null pour SUPER_ADMIN (= aucun filtre, accès à tout),
// sinon la liste des ecoleId auxquels l'utilisateur est activement affecté.
export async function getEcoleIdsScope(prisma, user) {
  if (user.role === 'SUPER_ADMIN') return null

  const utilisateurEcoles = await prisma.utilisateurEcole.findMany({
    where: { utilisateurId: user.id, actif: true },
    select: { ecoleId: true }
  })

  return utilisateurEcoles.map(ue => ue.ecoleId)
}
