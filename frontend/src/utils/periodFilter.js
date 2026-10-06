// Filtre une date selon une période : 'jour', 'semaine' ou 'mois'.
// referenceDate est le jour choisi par l'utilisateur (par défaut aujourd'hui) —
// il ancre la période, ce qui permet de consulter n'importe quelle date passée.

// Bornes de la période calendaire contenant referenceDate : le jour, la semaine du lundi au
// dimanche (et non les 7 derniers jours glissants, qui débordaient sur le mois précédent et
// dépassaient alors "Ce mois"), ou le mois.
export function bornesPeriode(period, referenceDate = new Date()) {
  const ref = new Date(referenceDate)
  const debut = new Date(ref)
  const fin = new Date(ref)
  if (period === 'semaine') {
    debut.setDate(ref.getDate() - ((ref.getDay() + 6) % 7))
    fin.setTime(debut.getTime())
    fin.setDate(debut.getDate() + 6)
  } else if (period === 'mois') {
    debut.setDate(1)
    fin.setMonth(ref.getMonth() + 1, 0)
  }
  debut.setHours(0, 0, 0, 0)
  fin.setHours(23, 59, 59, 999)
  return { debut, fin }
}

export function isInPeriod(date, period, referenceDate = new Date()) {
  if (!['jour', 'semaine', 'mois'].includes(period)) return true
  const d = new Date(date)
  const { debut, fin } = bornesPeriode(period, referenceDate)
  return d >= debut && d <= fin
}

// Décale la date de référence d'une période entière (sens = -1 ou +1)
export function decalerPeriode(period, referenceDate, sens) {
  const d = new Date(referenceDate)
  if (period === 'jour') d.setDate(d.getDate() + sens)
  else if (period === 'semaine') d.setDate(d.getDate() + 7 * sens)
  else d.setMonth(d.getMonth() + sens, 1)
  return d
}

// Libellé lisible de la période réellement couverte, ex. "du lundi 5 au dimanche 11 octobre 2026"
export function libellePeriode(period, referenceDate = new Date()) {
  const { debut, fin } = bornesPeriode(period, referenceDate)
  if (period === 'mois') {
    const mois = debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return mois.charAt(0).toUpperCase() + mois.slice(1)
  }
  if (period === 'semaine') {
    const memeMois = debut.getMonth() === fin.getMonth()
    const debutTxt = debut.toLocaleDateString('fr-FR', memeMois ? { weekday: 'long', day: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long' })
    return `Du ${debutTxt} au ${fin.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  const jour = debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return jour.charAt(0).toUpperCase() + jour.slice(1)
}

export const PERIOD_LABELS = {
  jour: "Aujourd'hui",
  semaine: 'Cette semaine',
  mois: 'Ce mois'
}
