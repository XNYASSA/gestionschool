export function calculerStatut(montantDu, montantPaye) {
  if (montantDu > 0 && montantPaye >= montantDu) return 'SOLDE'
  if (montantPaye > 0) return 'PARTIEL'
  return 'IMPAYE'
}

// Crée les fiches de frais (inscription + tranches) d'un élève à partir de la
// ConfigurationFrais de son école, en imputant un montant déjà versé (le cas
// échéant) sur l'inscription puis les tranches dans l'ordre. Ne fait rien si
// l'école n'a pas encore de configuration de frais.
export async function creerInscriptionsFraisPourEleve(prisma, eleveId, ecoleId, montantDejaVerse = 0) {
  const config = await prisma.configurationFrais.findUnique({
    where: { ecoleId },
    include: { tranches: { orderBy: { numero: 'asc' } } }
  })
  if (!config) return

  const postes = [
    { tranche: 'inscription', montant: config.montantInscription },
    ...config.tranches.map(t => ({ tranche: `tranche${t.numero}`, montant: t.montant }))
  ]

  let restant = montantDejaVerse || 0

  for (const poste of postes) {
    const montantPaye = Math.max(0, Math.min(restant, poste.montant))
    restant -= montantPaye

    await prisma.inscriptionFrais.create({
      data: {
        eleveId,
        tranche: poste.tranche,
        montantDu: poste.montant,
        montantPaye,
        statut: calculerStatut(poste.montant, montantPaye),
        statutValidation: 'VALIDE'
      }
    })
  }
}
