// L'année scolaire commence en septembre : de septembre à décembre on est dans
// "année-année+1", de janvier à août dans "année-1-année".
const debutAnneeCourante = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1

export const ANNEE_SCOLAIRE_COURANTE = `${debutAnneeCourante}-${debutAnneeCourante + 1}`
export const ANNEES_SCOLAIRES = Array.from({ length: 8 }, (_, i) => `${debutAnneeCourante - 3 + i}-${debutAnneeCourante - 2 + i}`)
