// Barème de notation APC (approche par compétences) utilisé tant qu'une école n'a pas défini le sien.
// Une note appartient à la ligne où valMin <= note < valMax.
export const BAREME_APC_DEFAUT = [
  { valMin: 0, valMax: 3, apc: 'NA', gpa: 0, mentionFr: 'Nul', mentionEn: 'Very weak' },
  { valMin: 3, valMax: 7, apc: 'NA', gpa: 0, mentionFr: 'Très faible', mentionEn: 'Weak' },
  { valMin: 7, valMax: 8, apc: 'NA', gpa: 0, mentionFr: 'Faible', mentionEn: 'Poor' },
  { valMin: 8, valMax: 9, apc: 'NA', gpa: 0, mentionFr: 'Insuffisant', mentionEn: 'Below average' },
  { valMin: 9, valMax: 10, apc: 'NA', gpa: 0, mentionFr: 'Médiocre', mentionEn: 'Below average' },
  { valMin: 10, valMax: 12, apc: 'NA', gpa: 0, mentionFr: 'Passable', mentionEn: 'Average' },
  { valMin: 12, valMax: 14, apc: 'ECA', gpa: 0, mentionFr: 'Assez bien', mentionEn: 'Fairly good' },
  { valMin: 14, valMax: 16, apc: 'A', gpa: 0, mentionFr: 'Bien', mentionEn: 'Good' },
  { valMin: 16, valMax: 18, apc: 'A', gpa: 0, mentionFr: 'Très bien', mentionEn: 'Very good' },
  { valMin: 18, valMax: 20, apc: 'A+', gpa: 0, mentionFr: 'Excellent', mentionEn: 'Excellent' },
  { valMin: 20, valMax: 20.01, apc: 'A+', gpa: 0, mentionFr: 'Parfait', mentionEn: 'Parfait' }
]

// Barème de notation d'une école (personnalisé si défini, sinon le barème APC par défaut ci-dessus)
export async function baremeEcole(prisma, ecoleId) {
  const lignes = await prisma.baremeNotation.findMany({ where: { ecoleId }, orderBy: { valMin: 'asc' } })
  if (lignes.length === 0) return { parDefaut: true, lignes: BAREME_APC_DEFAUT }
  return {
    parDefaut: false,
    lignes: lignes.map(l => ({ valMin: l.valMin, valMax: l.valMax, apc: l.apc, gpa: l.gpa, mentionFr: l.mentionFr, mentionEn: l.mentionEn }))
  }
}

// Ligne du barème où valMin <= note < valMax (null si la note est vide ou hors barème)
export function mentionPourNote(lignes, note) {
  if (note === null || note === undefined || Number.isNaN(note)) return null
  return lignes.find(l => note >= l.valMin && note < l.valMax) || null
}
