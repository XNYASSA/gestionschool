// Statut de paiement global d'un élève, déduit de ses fiches InscriptionFrais.
// SOLDE (vert) = tout payé, IMPAYE (rouge) = rien payé, PARTIEL (jaune) = le reste.
export function getStatutPaiement(eleve) {
  const frais = eleve?.inscriptionsFrais || []
  if (frais.length === 0) return 'IMPAYE'
  if (frais.every(f => f.statut === 'SOLDE')) return 'SOLDE'
  if (frais.every(f => f.montantPaye === 0)) return 'IMPAYE'
  return 'PARTIEL'
}

export const STATUT_PAIEMENT_STYLE = {
  SOLDE: { label: '✓ Payé', className: 'bg-green-100 text-green-700' },
  PARTIEL: { label: '⚠ Partiel', className: 'bg-yellow-100 text-yellow-700' },
  IMPAYE: { label: '✗ Impayé', className: 'bg-red-100 text-red-700' }
}
