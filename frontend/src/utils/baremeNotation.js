// Ligne du barème où valMin <= note < valMax (null si la note est vide ou hors barème)
export function mentionPourNote(lignes, note) {
  if (note === null || note === undefined || note === '' || Number.isNaN(Number(note))) return null
  const n = Number(note)
  return (lignes || []).find(l => n >= l.valMin && n < l.valMax) || null
}
