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
