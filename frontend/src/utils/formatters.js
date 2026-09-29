// Espace insécable : garantit qu'un montant ("1 200 000 FCFA") reste toujours sur une seule ligne,
// même dans une colonne étroite (téléphone), quel que soit le séparateur de milliers rendu par le
// navigateur (espace normale, insécable ou fine insécable selon les appareils).
const espaceInsecable = (texte) => texte.replace(/[\s  ]/g, ' ')

// Formatage des montants en FCFA avec séparateur de milliers (chiffres complets), toujours sur une
// seule ligne à l'affichage.
export const formatFCFA = (amount) => {
  if (!amount && amount !== 0) return '0 FCFA'
  const formatted = Math.round(amount).toLocaleString('fr-FR')
  return espaceInsecable(`${formatted} FCFA`)
}

// Format court pour les dashboards (ex. 1.2M FCFA) - UTILE POUR LES GRANDS NOMBRES
export const formatFCFAShort = (amount) => {
  if (!amount && amount !== 0) return '0 FCFA'
  if (amount >= 1000000) {
    return espaceInsecable(`${(amount / 1000000).toFixed(2).replace('.', ',')}M FCFA`)
  }
  if (amount >= 1000) {
    return espaceInsecable(`${Math.round(amount / 1000)}K FCFA`)
  }
  return espaceInsecable(`${Math.round(amount)} FCFA`)
}

// Format LONG pour le dashboard propriétaire (chiffres complets, pas d'abréviation)
export const formatFCFALong = formatFCFA

// Format pour les pourcentages
export const formatPercent = (value, decimals = 1) => {
  if (!value && value !== 0) return '0%'
  return `${value.toFixed(decimals).replace('.', ',')}%`
}

// Format de la date
export const formatDate = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(date).toLocaleDateString('fr-FR', options)
}
