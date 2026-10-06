// Filtre une date selon une période : 'jour', 'semaine' ou 'mois'.
// referenceDate est le jour choisi par l'utilisateur (par défaut aujourd'hui) —
// il ancre la période, ce qui permet de consulter n'importe quelle date passée.
export function isInPeriod(date, period, referenceDate = new Date()) {
  const d = new Date(date)
  const now = new Date(referenceDate)

  if (period === 'jour') {
    return d.toDateString() === now.toDateString()
  }
  // Semaine calendaire (du lundi au jour de référence inclus), et non les 7 derniers jours glissants :
  // sinon, en début de mois, "Cette semaine" débordait sur le mois précédent et dépassait "Ce mois".
  if (period === 'semaine') {
    const lundi = new Date(now)
    lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    lundi.setHours(0, 0, 0, 0)
    const finJour = new Date(now)
    finJour.setHours(23, 59, 59, 999)
    return d >= lundi && d <= finJour
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
