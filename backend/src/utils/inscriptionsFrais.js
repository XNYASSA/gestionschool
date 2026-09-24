export function calculerStatut(montantDu, montantPaye) {
  if (montantDu > 0 && montantPaye >= montantDu) return 'SOLDE'
  if (montantPaye > 0) return 'PARTIEL'
  return 'IMPAYE'
}

// Classe un poste (tranche key stocké sur InscriptionFrais/Paiement) selon la
// convention de préfixe fixée par ce fichier : "inscription", "tranche{n}" ou
// "annexe_<slug>". Utilisé partout où les postes doivent être groupés par nature
// (rapports, anomalies) sans avoir besoin d'une colonne dédiée en base.
export function categoriserPoste(tranche) {
  if (tranche === 'inscription') return 'INSCRIPTION'
  if (/^tranche\d+$/.test(tranche)) return 'TRANCHE'
  return 'FRAIS_ANNEXE'
}

// Le poste "Inscription" vu par les secrétaires regroupe les frais d'inscription et tous
// les frais hors tranches de pension (livret médical, laboratoire, TD...). Ces postes sont
// rangés dans l'ordre où un versement les impute : l'inscription, puis les frais annexes.
export function postesInscription(postes) {
  return postes
    .filter(p => categoriserPoste(p.tranche) !== 'TRANCHE')
    .sort((a, b) => (a.tranche === 'inscription' ? 0 : 1) - (b.tranche === 'inscription' ? 0 : 1) || a.tranche.localeCompare(b.tranche))
}

// Répartit un montant sur ces postes selon leur solde restant. `reste` > 0 si le montant
// dépasse ce qu'il restait à payer sur l'ensemble.
export function repartirSurPostesInscription(postes, montant) {
  const allocations = []
  let reste = montant
  for (const poste of postesInscription(postes)) {
    if (reste <= 0) break
    const part = Math.min(reste, Math.max(0, poste.montantDu - poste.montantPaye))
    if (part <= 0) continue
    allocations.push({ poste, montant: part })
    reste -= part
  }
  return { allocations, reste }
}

// Aligne les montants payés d'un élève sur des cibles cumulées (colonnes Inscription /
// Tranche 1-3 d'un fichier Excel). "inscription" = inscription + frais hors tranches.
// Ne fait qu'augmenter : une cible inférieure ou égale à ce qui est déjà payé est ignorée.
// Retourne ce qui a été ajouté et les montants qui n'ont pu être imputés (cible > dû).
export async function synchroniserPaiementsCibles(prisma, eleveId, cibles) {
  const postes = await prisma.inscriptionFrais.findMany({ where: { eleveId } })
  const ajouts = []
  const exces = []

  const appliquer = async (poste, ajout) => {
    const nouveau = poste.montantPaye + ajout
    await prisma.inscriptionFrais.update({
      where: { id: poste.id },
      data: { montantPaye: nouveau, statut: calculerStatut(poste.montantDu, nouveau) }
    })
    poste.montantPaye = nouveau
    ajouts.push({ tranche: poste.tranche, montant: ajout })
  }

  for (const tranche of ['inscription', 'tranche1', 'tranche2', 'tranche3']) {
    const brut = cibles[tranche]
    if (brut === undefined || brut === null || brut === '') continue
    const cible = parseInt(brut)
    if (isNaN(cible) || cible < 0) continue

    if (tranche === 'inscription') {
      const groupe = postesInscription(postes)
      const deja = groupe.reduce((sum, p) => sum + p.montantPaye, 0)
      if (groupe.length === 0 || cible <= deja) continue
      const { allocations, reste } = repartirSurPostesInscription(groupe, cible - deja)
      for (const a of allocations) await appliquer(a.poste, a.montant)
      if (reste > 0) exces.push({ tranche, montant: reste })
    } else {
      const poste = postes.find(p => p.tranche === tranche)
      if (!poste || cible <= poste.montantPaye) continue
      const ajout = Math.min(cible, poste.montantDu) - poste.montantPaye
      if (ajout > 0) await appliquer(poste, ajout)
      if (cible > poste.montantDu) exces.push({ tranche, montant: cible - poste.montantDu })
    }
  }
  return { ajouts, exces }
}

export function slugifier(nom) {
  return nom
    .replace(/œ/gi, 'oe') // la ligature n'est pas décomposée par normalize('NFD')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toLowerCase())
}

// Crée les fiches de frais (inscription + frais annexes + tranches) d'un élève à
// partir du barème (ConfigurationFrais) correspondant au niveau de sa classe, en
// imputant un montant déjà versé (le cas échéant) sur l'inscription puis les
// postes dans l'ordre. Ne fait rien si aucun barème n'est encore lié à ce niveau
// pour cette école — retourne un tableau vide dans ce cas (jamais d'exception),
// à l'appelant de décider si ça mérite un avertissement non bloquant.
export async function creerInscriptionsFraisPourEleve(prisma, eleveId, ecoleId, niveau, montantDejaVerse = 0) {
  const lien = await prisma.configurationFraisNiveau.findUnique({
    where: { ecoleId_niveau: { ecoleId, niveau } },
    include: {
      configurationFrais: {
        include: {
          tranches: { orderBy: { numero: 'asc' } },
          fraisAnnexes: true
        }
      }
    }
  })
  if (!lien) return []

  const config = lien.configurationFrais

  const postes = [
    { tranche: 'inscription', libelle: "Frais d'inscription", montant: config.montantInscription },
    ...config.fraisAnnexes.map(f => ({ tranche: `annexe_${slugifier(f.nom)}`, libelle: f.nom, montant: f.montant })),
    ...config.tranches.map(t => ({ tranche: `tranche${t.numero}`, libelle: `Tranche ${t.numero}`, montant: t.montant }))
  ]

  let restant = montantDejaVerse || 0
  const creees = []

  for (const poste of postes) {
    const montantPaye = Math.max(0, Math.min(restant, poste.montant))
    restant -= montantPaye

    const creee = await prisma.inscriptionFrais.create({
      data: {
        eleveId,
        tranche: poste.tranche,
        libelle: poste.libelle,
        montantDu: poste.montant,
        montantPaye,
        statut: calculerStatut(poste.montant, montantPaye),
        statutValidation: 'VALIDE'
      }
    })
    creees.push(creee)
  }

  return creees
}

// Propage un montant de poste (inscription, tranche ou frais annexe) modifié dans
// un barème vers les fiches InscriptionFrais des élèves dont la classe appartient
// aux niveaux liés à CE barème. Crée la ligne si l'élève n'en avait pas encore
// (élève déjà inscrit avant que ce barème n'existe), sinon met à jour montantDu
// et recalcule le statut — le montant déjà payé n'est jamais touché.
export async function synchroniserInscriptionsFrais(prisma, configurationFraisId, trancheLabel, libelle, nouveauMontant) {
  const niveauxLies = await prisma.configurationFraisNiveau.findMany({
    where: { configurationFraisId },
    select: { ecoleId: true, niveau: true }
  })
  if (niveauxLies.length === 0) return 0

  const ecoleId = niveauxLies[0].ecoleId
  const niveaux = niveauxLies.map(n => n.niveau)

  const eleves = await prisma.eleve.findMany({
    where: { classe: { ecoleId, niveau: { in: niveaux } } },
    select: { id: true }
  })

  for (const eleve of eleves) {
    const existante = await prisma.inscriptionFrais.findFirst({
      where: { eleveId: eleve.id, tranche: trancheLabel }
    })

    if (existante) {
      await prisma.inscriptionFrais.update({
        where: { id: existante.id },
        data: {
          montantDu: nouveauMontant,
          libelle,
          statut: calculerStatut(nouveauMontant, existante.montantPaye)
        }
      })
    } else {
      await prisma.inscriptionFrais.create({
        data: {
          eleveId: eleve.id,
          tranche: trancheLabel,
          libelle,
          montantDu: nouveauMontant,
          montantPaye: 0,
          statut: 'IMPAYE',
          statutValidation: 'VALIDE'
        }
      })
    }
  }

  return eleves.length
}
