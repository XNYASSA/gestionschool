// Filières de l'enseignement technique. Une classe technique est rattachée à une discipline
// (industriel / commercial) et à une langue (francophone / anglophone) par son niveau
// ("Industriel 2ème Année", "Commercial Year 3"...) ; la filière est portée par chaque élève.
export const FILIERES = {
  industriel: {
    fr: [
      'Chaudronnerie (soudure)', "Industrie de l'habillement", 'Mécanique auto', 'Menuiserie',
      'Installation sanitaire (IS)', 'Économie sociale et familiale (ESF)', 'Maçonnerie',
      'Froid et climatisation', 'Électricité auto', "Électricité d'équipement", 'Électronique'
    ],
    en: [
      'Boilermaking (welding)', 'Clothing industry (garment making)', 'Auto mechanics', 'Carpentry / Joinery',
      'Plumbing (sanitary installation)', 'Home economics (social and family economy)', 'Masonry',
      'Refrigeration and air conditioning', 'Auto electricity', 'Electrical engineering (equipment)', 'Electronics'
    ]
  },
  commercial: {
    fr: [
      'Action et communication administrative (ACA)', 'Action et communication commerciale (ACC)',
      'Comptabilité', 'Secrétariat bureautique', 'Comptabilité et gestion'
    ],
    en: [
      'Administrative action and communication', 'Commercial action and communication',
      'Accounting', 'Secretarial studies (office automation)', 'Accounting and management'
    ]
  }
}

// { discipline, langue } d'une classe technique, null pour les autres classes
export function typeTechnique(classe) {
  const niveau = String(classe?.niveau || '')
  const discipline = /^industri/i.test(niveau) ? 'industriel' : /^commercial/i.test(niveau) ? 'commercial' : null
  if (!discipline) return null
  return { discipline, langue: /year/i.test(niveau) ? 'en' : 'fr' }
}

export function filieresPourClasse(classe) {
  const type = typeTechnique(classe)
  return type ? FILIERES[type.discipline][type.langue] : []
}
