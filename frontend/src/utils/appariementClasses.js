// Rapprochement du nom d'une feuille / de la colonne « Classe » d'un fichier de scolarité avec les
// classes de l'application ("6e", "3eESP", "FORM4 A", "2ndA4 ESP", "Tle D"... -> "6ème", "3ème ESP", "F4A"...).

const sansAccents = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Forme comparable d'un nom de classe : sans accents ni espaces, "ème/nde/ère" abrégés, "form" -> "f", "tle" -> "t"
export function canonClasse(nom) {
  return sansAccents(nom)
    .replace(/eme/g, 'e')
    .replace(/nde/g, 'nd')
    .replace(/ere/g, 'e')
    .replace(/^form(?=\d)/, 'f')
    .replace(/^tle/, 't')
}

// Un nom de classe peut aussi s'écrire sans la mention "A4" (ex. "2nde ALL" pour "2nde A4 ALL")
const variantes = (nom) => {
  const c = canonClasse(nom)
  return [...new Set([c, c.replace('a4', '')])].filter(Boolean)
}

// Classe unique correspondant au texte : nom identique, sinon unique classe dont le nom commence par ce texte.
// `classes` : classes candidates ({ id, nom, ecoleId }). Retourne null si aucune ou plusieurs correspondent.
export function trouverClasse(texte, classes) {
  const cible = canonClasse(texte)
  if (!cible) return null
  const exactes = classes.filter(c => variantes(c.nom).includes(cible))
  if (exactes.length === 1) return exactes[0]
  if (exactes.length > 1) return null
  const prefixe = classes.filter(c => variantes(c.nom).some(v => v.startsWith(cible) && cible.length >= 2))
  return prefixe.length === 1 ? prefixe[0] : null
}

// Cherche d'abord dans l'école choisie, puis dans toutes les autres si elle n'en contient aucune.
function trouverDansEcoles(texte, classes, ecoleId) {
  return trouverClasse(texte, classes.filter(c => c.ecoleId === ecoleId)) || trouverClasse(texte, classes.filter(c => c.ecoleId !== ecoleId))
}

// Classe proposée pour un groupe d'élèves d'une feuille : le nom de la feuille fait foi (une feuille = une classe) ;
// à défaut, la classe écrite dans la colonne « Classe » des lignes du groupe.
// Retourne { classe, parFeuille, ecart } : `parFeuille` = la classe vient du nom de la feuille ; `ecart` = la classe indiquée par la colonne « Classe » diffère de celle de la feuille.
export function proposerClasse({ feuille, classeTexte }, classes, ecoleId) {
  const parFeuille = trouverDansEcoles(feuille, classes, ecoleId)
  const parTexte = classeTexte ? trouverDansEcoles(classeTexte, classes, ecoleId) : null
  const classe = parFeuille || parTexte || null
  return { classe, parFeuille: !!parFeuille, ecart: parFeuille && parTexte && parFeuille.id !== parTexte.id ? parTexte : null }
}
