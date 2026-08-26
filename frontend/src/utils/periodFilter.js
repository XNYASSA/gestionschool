// Filtre une date selon une période : 'jour', 'semaine' ou 'mois'
export function isInPeriod(date, period) {
  const d = new Date(date)
  const now = new Date()

  if (period === 'jour') {
    return d.toDateString() === now.toDateString()
  }
  if (period === 'semaine') {
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    return d >= weekAgo && d <= now
  }
  if (period === 'mois') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  return true
}

export const PERIOD_LABELS = {
  jour: "Aujourd'hui",
  semaine: 'Cette semaine',
  mois: 'Ce mois'
}
