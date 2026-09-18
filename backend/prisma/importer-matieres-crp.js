import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Catalogues de matières issus des fichiers EagleSoft fournis par le client
// (ETAT_ListeMatières ESG/EST FR/ANGLO.xlsx). Chaque ligne : [code, abreviation, nom, departement|null].
// Le "code" (ex: "M012") n'est unique qu'à l'intérieur de son propre fichier
// d'origine — deux fichiers différents réutilisent les mêmes codes pour des
// matières différentes, donc aucune contrainte d'unicité n'est appliquée dessus.

const ESG_FR = [
  ['M012', 'INFO', 'INFORMATIQUE', 'INFORMATIQUE'],
  ['M001', 'ALL', 'ALLEMAND', 'LITTERATURE'],
  ['M002', 'ANG', 'ANGLAIS', 'LITTERATURE'],
  ['M025', 'CHN', 'CHINOIS (MANDARIN)', 'LITTERATURE'],
  ['M026', 'CO', 'CORRECTION ORTHOGRAPHIQUE', 'LITTERATURE'],
  ['M007', 'ESP E', 'ESPAGNOL ECRITE', 'LITTERATURE'],
  ['M031', 'ESP O', 'ESPAGNOL ORALITE', 'LITTERATURE'],
  ['M008', 'ET', 'ETUDE DE TEXTE', 'LITTERATURE'],
  ['M028', 'EE', 'EXPRESSION ECRITE', 'LITTERATURE'],
  ['M027', 'EO', 'EXPRESSION ORALE', 'LITTERATURE'],
  ['M013', 'LAN', 'LANGUE', 'LITTERATURE'],
  ['M041', 'LCN', 'LANGUES ET CULTURES NATIONALES', 'LITTERATURE'],
  ['M024', 'LAT', 'LATIN', 'LITTERATURE'],
  ['M014', 'LIT', 'LITTERATURE', 'LITTERATURE'],
  ['M016', 'ORTHO', 'ORTHOGRAPHE', 'LITTERATURE'],
  ['M021', 'RED', 'REDACTION', 'LITTERATURE'],
  ['M034', 'CULNAT', 'CULTURE NATIONALE', 'SCIENCES SOCIALES'],
  ['M004', 'ESF', 'ECONOMIE SOCIALE ET FAMILIALE', 'SCIENCES SOCIALES'],
  ['M005', 'ECM', 'EDUCATION A LA CITOYENNETE ET MORALE', 'SCIENCES SOCIALES'],
  ['M040', 'EA', 'EDUCATION ARTISTIQUE', 'SCIENCES SOCIALES'],
  ['M032', 'ED MU', 'EDUCATION MUSICALE', 'SCIENCES SOCIALES'],
  ['M006', 'EPS', 'EDUCATION PHYSIQUE ET SPORTIVE', 'SCIENCES SOCIALES'],
  ['M009', 'GEO', 'GEOGRAPHIE', 'SCIENCES SOCIALES'],
  ['M010', 'HIST', 'HISTOIRE', 'SCIENCES SOCIALES'],
  ['M011', 'H-G', 'HISTOIRE - GEOGRAPHIE', 'SCIENCES SOCIALES'],
  ['M033', 'LANAT', 'LANGUE NATIONALE', 'SCIENCES SOCIALES'],
  ['M017', 'PHILO', 'PHILOSOPHIE', 'SCIENCES SOCIALES'],
  ['M023', 'TM', 'TRAVAIL MANUEL', 'SCIENCES SOCIALES'],
  ['M003', 'CH', 'CHIMIE', 'SCIENTIFIQUES'],
  ['M015', 'MATHS', 'MATHEMATIQUES', 'SCIENTIFIQUES'],
  ['M018', 'PHY', 'PHYSIQUE', 'SCIENTIFIQUES'],
  ['M019', 'PC', 'PHYSIQUE - CHIMIE', 'SCIENTIFIQUES'],
  ['M020', 'PCT', 'PHYSIQUE - CHIMIE - TECHNOLOGIE', 'SCIENTIFIQUES'],
  ['M037', 'SVTEEHB', "SCIENCE DE LA VIE ET DE LA TERRE, EDUCATION A L'ENVIRONNEMENT, HYGIENE ET BIOTECHNOLOGIE", 'SCIENTIFIQUES'],
  ['M035', 'SCE', 'SCIENCES', 'SCIENTIFIQUES'],
  ['M022', 'SVTEEHB', 'SCIENCES DE LA VIE ET DE LA TERRE', 'SCIENTIFIQUES'],
  ['M029', 'SVTEEHB', 'SCIENCES ET TECHNOLOGIES', 'SCIENTIFIQUES'],
  ['M030', 'SPT', 'SCIENCES PHYSIQUES ET TECHNOLOGIES', 'SCIENTIFIQUES'],
  ['M039', 'TP CH', 'TP CHIMIE', 'SCIENTIFIQUES'],
  ['M038', 'TP PH', 'TP PHYSIQUE', 'SCIENTIFIQUES'],
  ['M036', 'TP SVTEEHB', "TP SCIENCE DE LA VIE ET DE LA TERRE, EDUCATION A L'ENVIRONNEMENT, HYGIENNE ET BIOTECHNOLOGIE", 'SCIENTIFIQUES']
]

const ESG_ANGLO = [
  ['M009', 'B.MAT', 'BUSINESS MATHEMATICS', null],
  ['M024', 'COM/FIN', 'COMMERCE AND FINANCE', null],
  ['M035', 'COMP/AID/ACC', 'COMPUTER AIDED ACCOUNTING', null],
  ['M038', 'CORP/ACC', 'CORPORATE ACCOUNTING', null],
  ['M037', 'COST/MGT ACC', 'COST AND MANAGEMENT ACCOUNTING', null],
  ['M039', 'DIG/MRK/PRACT', 'DIGITAL MARKETING PRACTICE', null],
  ['M046', 'ENT.SHIP', 'ENTREPRENEURSHIP', null],
  ['M036', 'FIN/ACC', 'FINANCIAL ACCOUNTING', null],
  ['M016', 'GEOL', 'GEOLOGY', null],
  ['M014', 'INFO/PROCESS', 'INFORMATION PROCESSING', null],
  ['M034', 'INT/FIN/ACC', 'INTERNATIONAL FINANCIAL ACCOUNTING', null],
  ['M027', 'MARK/SKILL', 'MARKETING SKILLS', null],
  ['M047', 'OFF.PRACT', 'OFFICE PRACTICE', null],
  ['M022', 'OH/FIN ACCOUNT', 'OHADA FINANCIAL ACCOUNTING', null],
  ['M028', 'OH/FIN/REP ACC', 'OHADA FINANCIAL REPORT', null],
  ['M045', 'ORG/ADM/WRK/TEC', 'ORGANISATION OF ADMINISTRATIVE WORKS AND TECHNOLOGY', null],
  ['M041', 'PRO/MASTERRY', 'PRODUCT MASTERY', null],
  ['M044', 'PROF/COMM/SKILL', 'PROFESSIONAL COMMUNICATION SKILLS', null],
  ['M042', 'PROF/MRK', 'PROFESSIONAL MARKETING', null],
  ['M040', 'SAL METH / COMM', 'SALES METHODES AND COMMUNICATION', null],
  ['M033', 'ARABE', 'ARABE', 'LITERATURE'],
  ['M007', 'CHI', 'CHINESE', 'LITERATURE'],
  ['M001', 'CIT', 'CITIZENSHIP', 'LITERATURE'],
  ['M021', 'ECONS', 'ECONOMICS', 'LITERATURE'],
  ['M008', 'ENG LANG', 'ENGLISH LANGUAGE', 'LITERATURE'],
  ['M013', 'FREN LANG', 'FRENCH LANGUAGE', 'LITERATURE'],
  ['M002', 'GEO', 'GEOGRAPHY', 'LITERATURE'],
  ['M003', 'HIST', 'HISTORY', 'LITERATURE'],
  ['M025', 'LIT.ENG', 'LITERATURE IN ENGLISH', 'LITERATURE'],
  ['M019', 'SPAN LANG', 'SPANISH LANGUAGE', 'LITERATURE'],
  ['M011', 'A.MATHS', 'ADDITIONAL MATHEMATICS', 'SCIENTIFIC'],
  ['M026', 'BIO', 'BIOLOGY', 'SCIENTIFIC'],
  ['M012', 'B.MANAG', 'BUSINESS MANAGEMENT', 'SCIENTIFIC'],
  ['M004', 'CHEM', 'CHEMISTRY', 'SCIENTIFIC'],
  ['M031', 'COMM', 'COMMERCE', 'SCIENTIFIC'],
  ['M029', 'COMP', 'COMPUTER SCIENCES', 'SCIENTIFIC'],
  ['M050', 'FD SC', 'FOOD SCIENCE', 'SCIENTIFIC'],
  ['M005', 'F.MATHS', 'FURTHER MATHEMATICS', 'SCIENTIFIC'],
  ['M043', 'ICT', 'ICT', 'SCIENTIFIC'],
  ['M017', 'LAW AND GOV', 'LAW AND GOVERNMENT', 'SCIENTIFIC'],
  ['M048', 'LG', 'LOGIC', 'SCIENTIFIC'],
  ['M015', 'MATHS', 'MATHEMATICS', 'SCIENTIFIC'],
  ['M020', 'M.STAT', 'MATHS STAT', 'SCIENTIFIC'],
  ['M018', 'PHY', 'PHYSICS', 'SCIENTIFIC'],
  ['M032', 'PURE MATHS', 'PURE MATHEMATICS', 'SCIENTIFIC'],
  ['M030', 'PURE MATHS MECH', 'PURE MATHEMATICS MECHANICS/STATISTICS', 'SCIENTIFIC'],
  ['M010', 'H.BIO', 'HUMAN BIOLOGY', 'SOCIAL SCIENCE'],
  ['M023', 'ML', 'MANUAL LABOUR', 'SOCIAL SCIENCE'],
  ['M049', 'RL', 'RELIGION', 'SOCIAL SCIENCE'],
  ['M006', 'SPORTS', 'SPORTS', 'SOCIAL SCIENCE']
]

const EST_ANGLO = [
  ['M006', 'COM', 'Commerce', null],
  ['M005', 'ICT', 'Computer science', null],
  ['M008', 'EL', 'English language', 'LITERATURE'],
  ['M009', 'ELI', 'English literature', 'LITERATURE'],
  ['M010', 'FLAN', 'French language', 'LITERATURE'],
  ['M011', 'FLIT', 'French literature', 'LITERATURE'],
  ['M027', 'SE', 'Sub english', 'LITERATURE'],
  ['M040', 'ACC', 'ACCOUNTING', 'SCIENTIFIC'],
  ['M001', 'AM', 'Addition mathematics', 'SCIENTIFIC'],
  ['M036', 'BW', 'BENCHWORKS', 'SCIENTIFIC'],
  ['M002', 'BIO', 'Biology', 'SCIENTIFIC'],
  ['M003', 'CH', 'Chemistry', 'SCIENTIFIC'],
  ['M042', 'COM', 'COMMERCE', 'SCIENTIFIC'],
  ['M007', 'ECO', 'Economics', 'SCIENTIFIC'],
  ['M057', 'EE', 'EELECTRICAL CIRCUIT', 'SCIENTIFIC'],
  ['M053', 'EEC', 'ELECTRICAL AND ELECTRONINC CIRCUITS', 'SCIENTIFIC'],
  ['M031', 'ETD', 'ELECTRICAL TECHNOLOGY AND DIAGRAM', 'SCIENTIFIC'],
  ['M054', 'ETAM', 'ELECTRICAL TEST ANT MEASUREMENT', 'SCIENTIFIC'],
  ['M028', 'ENS', 'Engineering Sciences', 'SCIENTIFIC'],
  ['M056', 'FLEG', 'FAMILY LIFE EDUCATION AND GERONTOLOGY', 'SCIENTIFIC'],
  ['M050', 'FD', 'FASHION DRAWING', 'SCIENTIFIC'],
  ['M012', 'FM', 'Further mathematics', 'SCIENTIFIC'],
  ['M030', 'HSE', 'Health Safety and envirronment', 'SCIENTIFIC'],
  ['M021', 'HB', 'Human biology', 'SCIENTIFIC'],
  ['M043', 'INP', 'INFORMATION PROCESSING', 'SCIENTIFIC'],
  ['M044', 'LE', 'LEGISLATION', 'SCIENTIFIC'],
  ['M052', 'MAT', 'Material', 'SCIENTIFIC'],
  ['M022', 'MATHS', 'Mathematics', 'SCIENTIFIC'],
  ['M035', 'MT', 'MICHANIC TECHNOLOGY', 'SCIENTIFIC'],
  ['M041', 'OP', 'OFFICE PRATICE', 'SCIENTIFIC'],
  ['M048', 'PD', 'PATTERN DRAFTIN', 'SCIENTIFIC'],
  ['M025', 'PES', 'Physical education and sport', 'SCIENTIFIC'],
  ['M024', 'PHY', 'Physics', 'SCIENTIFIC'],
  ['M039', 'PT', 'PRACTICALS', 'SCIENTIFIC'],
  ['M034', 'PFETD', 'PRACTICALS FOR ELECTRICAL TECHNOLOGY AND DIAGRAM', 'SCIENTIFIC'],
  ['M032', 'PETD', 'PRACTICALS OF ELECTRICAL TECHNOLOGY AND DIAGRAM', 'SCIENTIFIC'],
  ['M037', 'PB', 'PRACTICLA BENCHWORKS', 'SCIENTIFIC'],
  ['M046', 'PAT', 'PROFESSION AND TRAINING', 'SCIENTIFIC'],
  ['M051', 'QT', 'Quantify', 'SCIENTIFIC'],
  ['M055', 'RMHS', 'RESOURREMANAGEMENT AND HOME STUDIE', 'SCIENTIFIC'],
  ['M049', 'SG', 'SEWING', 'SCIENTIFIC'],
  ['M033', 'TD', 'TECHNICAL DRAWING', 'SCIENTIFIC'],
  ['M047', 'TD', 'TECHNICAL DRAWING', 'SCIENTIFIC'],
  ['M038', 'TEC', 'TECHNOLOGY', 'SCIENTIFIC'],
  ['M045', 'THT', 'TEXTILE AND HARDWERE TECHNOLOGY', 'SCIENTIFIC'],
  ['M029', 'TT', 'Trade and Training', 'SCIENTIFIC'],
  ['M004', 'CIT', 'Citizenship', 'SOCIAL SCIENCE'],
  ['M013', 'FN', 'Food and nutrition', 'SOCIAL SCIENCE'],
  ['M014', 'GEO', 'Geography', 'SOCIAL SCIENCE'],
  ['M015', 'GEOL', 'Geology', 'SOCIAL SCIENCE'],
  ['M016', 'HIST', 'History', 'SOCIAL SCIENCE'],
  ['M017', 'HIST-GEO', 'History - geography', 'SOCIAL SCIENCE'],
  ['M020', 'HE', 'Home economics', 'SOCIAL SCIENCE'],
  ['M018', 'INFOTECH', 'Information and communication technology', 'SOCIAL SCIENCE'],
  ['M019', 'ML', 'Manual labour', 'SOCIAL SCIENCE'],
  ['M023', 'PHILO', 'Philosophy', 'SOCIAL SCIENCE'],
  ['M026', 'RS', 'Religious studies', 'SOCIAL SCIENCE']
]

const EST_FR = [
  ['M012', 'INFO', 'Informatique', null],
  ['M001', 'ALL', 'Allemand', 'Litterature'],
  ['M002', 'ANG', 'Anglais', 'Litterature'],
  ['M007', 'ESP', 'Espagnol', 'Litterature'],
  ['M008', 'ET', 'Etude de texte', 'Litterature'],
  ['M057', 'FR', 'FRANCAIS', 'Litterature'],
  ['M013', 'LAN', 'Langue', 'Litterature'],
  ['M014', 'LIT', 'Litterature', 'Litterature'],
  ['M016', 'ORTHO', 'Orthographe', 'Litterature'],
  ['M021', 'RED', 'Redaction', 'Litterature'],
  ['M032', 'CDM', 'CONNAISSANCE DU MATERIEL', 'Sciences sociales'],
  ['M004', 'ESF', 'Economie sociale et familiale', 'Sciences sociales'],
  ['M005', 'ECM', 'Education a la citoyennete et morale', 'Sciences sociales'],
  ['M006', 'EPS', 'Education physique et sportive', 'Sciences sociales'],
  ['M009', 'GEO', 'Geographie', 'Sciences sociales'],
  ['M010', 'HIST', 'Histoire', 'Sciences sociales'],
  ['M011', 'H-G', 'Histoire - geographie', 'Sciences sociales'],
  ['M059', 'HG', 'Hygiène', 'Sciences sociales'],
  ['M040', 'LEGIS', 'LEGISLATION DU TRAVAIL', 'Sciences sociales'],
  ['M017', 'PHILO', 'Philosophie', 'Sciences sociales'],
  ['M025', 'QHSE', 'QUANTITE GYGIENE SECURITE ET ENVIRONNEMENT', 'Sciences sociales'],
  ['M041', 'REDP', 'REDACTION PROFESSIONNELLE', 'Sciences sociales'],
  ['M023', 'TM', 'Travail manuel', 'Sciences sociales'],
  ['M028', 'AJUSTAGE', 'AJUSTAGE', 'Scientifiques'],
  ['M052', 'AHMV', 'AMENAGEMENT ET HYGIENE DU MULIEU DE VIE', 'Scientifiques'],
  ['M039', 'BU', 'BUREAUTIQUE', 'Scientifiques'],
  ['M003', 'CH', 'Chimie', 'Scientifiques'],
  ['M036', 'CE', 'CIRCUIT ELECTRIQUE', 'Scientifiques'],
  ['M045', 'COM', 'COMMERCE', 'Scientifiques'],
  ['M033', 'COMAT', 'CONNAISSANCE DES MATERIAUX', 'Scientifiques'],
  ['M034', 'COMET', 'CONNAISSANCE DU METIER', 'Scientifiques'],
  ['M055', 'COUPE', 'COUPE', 'Scientifiques'],
  ['M056', 'COUTURE', 'COUTURE', 'Scientifiques'],
  ['M053', 'CUP', 'CUISINE PRATIQUE', 'Scientifiques'],
  ['M049', 'CUT', 'CUISINE THEORIQUE', 'Scientifiques'],
  ['M026', 'DESSIN', 'DESSIN', 'Scientifiques'],
  ['M060', 'DM', 'DESSIN DE DE MODE', 'Scientifiques'],
  ['M054', 'DM', 'DESSIN DE MODE', 'Scientifiques'],
  ['M061', 'DT', 'DESSIN TECHNIQUE', 'Scientifiques'],
  ['M031', 'DE', 'DEVIS ET ESTIMATION', 'Scientifiques'],
  ['M043', 'DCC', 'DOCUMENTS COMMERCIAUX ET COMPTABILITE', 'Scientifiques'],
  ['M047', 'EAD', 'EDUCATION ARTISTIQUE ET DECORATIVE', 'Scientifiques'],
  ['M063', 'EE', 'ELECTRICTE ELECTRONIQUE', 'Scientifiques'],
  ['M030', 'ET', 'ENTREPRENARIAT', 'Scientifiques'],
  ['M038', 'ESME', 'ESSAIS ET MESURE', 'Scientifiques'],
  ['M046', 'GSO', 'GESTION SUR ORDINATEUR', 'Scientifiques'],
  ['M067', 'MATH COM', 'MATHEMATIQUE COMMERCIALE', 'Scientifiques'],
  ['M015', 'MATHS', 'Mathematiques', 'Scientifiques'],
  ['M024', 'MF', 'METIER ET FORMATION', 'Scientifiques'],
  ['M066', 'MCI', 'MOTEUR A COMBUSTION INTERNE', 'Scientifiques'],
  ['M048', 'NU', 'NUTRITION', 'Scientifiques'],
  ['M044', 'OTA', 'ORGANISATION DU TRAVAIL ADMINISTRATIF', 'Scientifiques'],
  ['M018', 'PHY', 'Physique', 'Scientifiques'],
  ['M019', 'PC', 'Physique - chimie', 'Scientifiques'],
  ['M020', 'PCT', 'Physique - chimie - technologie', 'Scientifiques'],
  ['M042', 'PRP', 'PRISE RAPIDE DE PAROLE', 'Scientifiques'],
  ['M035', 'PDR', 'PROCEDE DE REALISATION', 'Scientifiques'],
  ['M050', 'PGT', 'PURECULTURE GERONTOLOGIE THEORIQUE', 'Scientifiques'],
  ['M065', 'RV', 'RECEPTION VEHICULE', 'Scientifiques'],
  ['M037', 'SCHELEQ', 'SCHEMA ELECTRIQUE', 'Scientifiques'],
  ['M051', 'SEL', 'SCIEBNCE DES EQUIPEMENTS ET DU LOGEMENT', 'Scientifiques'],
  ['M022', 'SVT', 'Sciences de la vie et de la terre', 'Scientifiques'],
  ['M058', 'SP', 'SCIENCES PHYSIQUES', 'Scientifiques'],
  ['M027', 'TECHNO', 'TECHNOLOGIE', 'Scientifiques'],
  ['M062', 'TT', 'TECHNOLOGIE TEXTILE', 'Scientifiques'],
  ['M064', 'TRA', 'TRANSMISSION', 'Scientifiques'],
  ['M029', 'TP', 'TRAVAUX PRATIQUES', 'Scientifiques']
]

// Une école peut recevoir plusieurs catalogues (CRP_TECHNIQUE cumule EST FR + EST ANGLO,
// les deux filières linguistiques coexistant dans la même école).
const CATALOGUES_PAR_ECOLE = {
  CRP_FRANCOPHONE: [ESG_FR],
  CRP_ANGLOPHONE: [ESG_ANGLO],
  CRP_TECHNIQUE: [EST_FR, EST_ANGLO],
  // CBM n'a qu'une section générale francophone (pas d'anglophone ni de technique).
  CBM: [ESG_FR]
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run — aucune écriture en base\n' : '✍️  Import des matières CRP\n')

  for (const [nomCourt, catalogues] of Object.entries(CATALOGUES_PAR_ECOLE)) {
    const ecole = await prisma.ecole.findUnique({ where: { nomCourt } })
    if (!ecole) { console.log(`⚠️  École "${nomCourt}" introuvable.`); continue }

    const existantes = await prisma.matiere.findMany({ where: { ecoleId: ecole.id }, include: { _count: { select: { enseignantClasseMatieres: true } } } })
    const utilisees = existantes.filter(m => m._count.enseignantClasseMatieres > 0)
    if (utilisees.length > 0) {
      console.log(`⚠️  ${nomCourt} — ${utilisees.length} matière(s) déjà affectée(s) à un enseignant, remplacement annulé pour cette école.`)
      continue
    }

    console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — suppression de ${existantes.length} matière(s) placeholder existante(s)`)
    if (!DRY_RUN) {
      await prisma.matiere.deleteMany({ where: { ecoleId: ecole.id } })
    }

    const toutes = catalogues.flat()
    console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}${nomCourt} — création de ${toutes.length} matière(s)`)
    if (!DRY_RUN) {
      await prisma.matiere.createMany({
        data: toutes.map(([code, abreviation, nom, departement]) => ({
          ecoleId: ecole.id, code, abreviation, nom, departement
        }))
      })
    }
  }

  console.log(DRY_RUN ? '\n🔍 Dry-run terminé — relancer sans --dry-run pour appliquer.' : '\n✅ Terminé.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
