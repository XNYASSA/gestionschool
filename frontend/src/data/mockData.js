// École fictive: Collège Rosa-Parks, Yaoundé

export const schoolData = {
  name: "Collège Rosa-Parks",
  location: "Yaoundé, Cameroun",
  phone: "+237 6 XX XXX XXXX",
  email: "info@collegerosparks.cm"
}

// Profils de connexion pour la démo
export const demoProfiles = [
  {
    id: 'owner-nkonga',
    role: 'owner',
    name: 'Admin École',
    title: 'Administrateur',
    avatar: '🔐',
    color: 'from-purple-500 to-pink-500',
    email: 'michelmanga941@gmail.com',
    password: 'demo123'
  },
  {
    id: 'director-mbakop',
    role: 'director',
    name: 'Guy Mbakop Roger',
    title: 'Directeur Général',
    avatar: '👨‍💼',
    color: 'from-blue-500 to-cyan-500',
    email: 'yves@school.cm',
    password: 'demo123'
  },
  {
    id: 'secretary-ayissi',
    role: 'secretary',
    name: 'Mme Marie AYISSI',
    title: 'Secrétaire de Direction',
    avatar: '👩‍💻',
    color: 'from-green-500 to-emerald-500',
    email: 'marie@school.cm',
    password: 'demo123'
  },
  {
    id: 'teacher-ines-math',
    role: 'teacher',
    name: 'Mme Inès AYISSI',
    title: 'Professeur de Mathématiques',
    avatar: '👩‍🏫',
    color: 'from-orange-500 to-red-500',
    email: 'ines.math@school.cm',
    password: 'demo123',
    subjects: ['Mathématiques'],
    classes: ['6ème A', '5ème B', '3ème A']
  },
  {
    id: 'teacher-benjamin-english',
    role: 'teacher',
    name: 'Mr. Benjamin NCHANJI',
    title: 'Professor of English',
    avatar: '👨‍🏫',
    color: 'from-yellow-500 to-orange-500',
    email: 'benjamin.english@school.cm',
    password: 'demo123',
    subjects: ['English'],
    classes: ['Form 1 A', 'Form 3 B']
  }
]

// Sections de l'établissement
export const sections = [
  { id: 'general-fr', name: 'Générale Francophone', code: 'MINESEC', color: 'blue' },
  { id: 'general-en', name: 'Générale Anglophone', code: 'GCE', color: 'green' },
  { id: 'technical', name: 'Technique', code: 'TECH', color: 'orange' }
]

// Élèves - mélange MINESEC (francophone) et GCE (anglophone)
export const students = [
  {
    id: 1,
    firstName: "Nadia",
    lastName: "Kengni",
    system: "MINESEC",
    level: "6ème",
    class: "6ème A",
    parentPhone: "+237 670 123 456",
    parentName: "M. Jean Kengni",
    registrationFee: 80000,
    paid: 80000,
    status: "Soldé"
  },
  {
    id: 2,
    firstName: "Marcus",
    lastName: "Nkonga",
    system: "GCE",
    level: "Form 2",
    class: "Form 2 A",
    parentPhone: "+237 675 234 567",
    parentName: "Mrs. Angela Nkonga",
    registrationFee: 100000,
    paid: 60000,
    status: "Partiel"
  },
  {
    id: 3,
    firstName: "Amina",
    lastName: "Bah",
    system: "MINESEC",
    level: "5ème",
    class: "5ème B",
    parentPhone: "+237 678 345 678",
    parentName: "M. Ibrahim Bah",
    registrationFee: 80000,
    paid: 0,
    status: "Impayé"
  },
  {
    id: 4,
    firstName: "Joshua",
    lastName: "Mbianchi",
    system: "GCE",
    level: "Form 3",
    class: "Form 3 A",
    parentPhone: "+237 690 456 789",
    parentName: "Mr. Paul Mbianchi",
    registrationFee: 100000,
    paid: 100000,
    status: "Soldé"
  },
  {
    id: 5,
    firstName: "Fabrice",
    lastName: "Njepe",
    system: "MINESEC",
    level: "4ème",
    class: "4ème A",
    parentPhone: "+237 691 567 890",
    parentName: "M. Claude Njepe",
    registrationFee: 90000,
    paid: 45000,
    status: "Partiel"
  },
  {
    id: 6,
    firstName: "Sophia",
    lastName: "Tandoh",
    system: "GCE",
    level: "Form 1",
    class: "Form 1 B",
    parentPhone: "+237 695 678 901",
    parentName: "Mrs. Lucy Tandoh",
    registrationFee: 100000,
    paid: 100000,
    status: "Soldé"
  },
  {
    id: 7,
    firstName: "Yves",
    lastName: "Fotso",
    system: "MINESEC",
    level: "3ème",
    class: "3ème A",
    parentPhone: "+237 696 789 012",
    parentName: "M. Albert Fotso",
    registrationFee: 95000,
    paid: 0,
    status: "Impayé"
  },
  {
    id: 8,
    firstName: "Victoria",
    lastName: "Njoya",
    system: "MINESEC",
    level: "2nde",
    class: "2nde A",
    parentPhone: "+237 697 890 123",
    parentName: "Mme Rose Njoya",
    registrationFee: 100000,
    paid: 100000,
    status: "Soldé"
  },
  {
    id: 9,
    firstName: "Emmanuel",
    lastName: "Chuyong",
    system: "GCE",
    level: "Lower Sixth",
    class: "Lower Sixth A",
    parentPhone: "+237 698 901 234",
    parentName: "Mr. Thomas Chuyong",
    registrationFee: 120000,
    paid: 120000,
    status: "Soldé"
  },
  {
    id: 10,
    firstName: "Christine",
    lastName: "Donfouet",
    system: "MINESEC",
    level: "1ère",
    class: "1ère S",
    parentPhone: "+237 699 012 345",
    parentName: "Mme Jeanne Donfouet",
    registrationFee: 110000,
    paid: 55000,
    status: "Partiel"
  },
  {
    id: 11,
    firstName: "Daniel",
    lastName: "Epie",
    system: "GCE",
    level: "Upper Sixth",
    class: "Upper Sixth A",
    parentPhone: "+237 600 123 456",
    parentName: "Mr. George Epie",
    registrationFee: 130000,
    paid: 0,
    status: "Impayé"
  },
  {
    id: 12,
    firstName: "Laurence",
    lastName: "Mevogo",
    system: "MINESEC",
    level: "Terminale",
    class: "Terminale D",
    parentPhone: "+237 601 234 567",
    parentName: "M. Marcel Mevogo",
    registrationFee: 115000,
    paid: 115000,
    status: "Soldé"
  }
]

// Notes par élève - matières avec coefficients
export const grades = [
  // Nadia - 6ème A (MINESEC)
  {
    studentId: 1,
    subject: "Mathématiques",
    coefficient: 4,
    grade: 18
  },
  {
    studentId: 1,
    subject: "Français",
    coefficient: 4,
    grade: 17
  },
  {
    studentId: 1,
    subject: "Anglais",
    coefficient: 3,
    grade: 15
  },
  {
    studentId: 1,
    subject: "Physique-Chimie",
    coefficient: 3,
    grade: 16
  },
  {
    studentId: 1,
    subject: "Sciences de la Vie",
    coefficient: 2,
    grade: 17
  },
  {
    studentId: 1,
    subject: "Histoire-Géographie",
    coefficient: 2,
    grade: 14
  },

  // Marcus - Form 2 A (GCE)
  {
    studentId: 2,
    subject: "English",
    coefficient: 4,
    grade: 14
  },
  {
    studentId: 2,
    subject: "Mathematics",
    coefficient: 4,
    grade: 12
  },
  {
    studentId: 2,
    subject: "Physics",
    coefficient: 3,
    grade: 13
  },
  {
    studentId: 2,
    subject: "Chemistry",
    coefficient: 3,
    grade: 11
  },
  {
    studentId: 2,
    subject: "Biology",
    coefficient: 2,
    grade: 12
  },
  {
    studentId: 2,
    subject: "Geography",
    coefficient: 2,
    grade: 10
  },

  // Amina - 5ème B (MINESEC)
  {
    studentId: 3,
    subject: "Mathématiques",
    coefficient: 4,
    grade: 11
  },
  {
    studentId: 3,
    subject: "Français",
    coefficient: 4,
    grade: 9
  },
  {
    studentId: 3,
    subject: "Anglais",
    coefficient: 3,
    grade: 8
  },
  {
    studentId: 3,
    subject: "Physique-Chimie",
    coefficient: 3,
    grade: 7
  },
  {
    studentId: 3,
    subject: "Sciences de la Vie",
    coefficient: 2,
    grade: 8
  },
  {
    studentId: 3,
    subject: "Histoire-Géographie",
    coefficient: 2,
    grade: 6
  },

  // Joshua - Form 3 A (GCE)
  {
    studentId: 4,
    subject: "English",
    coefficient: 4,
    grade: 19
  },
  {
    studentId: 4,
    subject: "Mathematics",
    coefficient: 4,
    grade: 18
  },
  {
    studentId: 4,
    subject: "Physics",
    coefficient: 3,
    grade: 17
  },
  {
    studentId: 4,
    subject: "Chemistry",
    coefficient: 3,
    grade: 18
  },
  {
    studentId: 4,
    subject: "Biology",
    coefficient: 2,
    grade: 16
  },
  {
    studentId: 4,
    subject: "Geography",
    coefficient: 2,
    grade: 15
  },

  // Fabrice - 4ème A (MINESEC)
  {
    studentId: 5,
    subject: "Mathématiques",
    coefficient: 4,
    grade: 15
  },
  {
    studentId: 5,
    subject: "Français",
    coefficient: 4,
    grade: 16
  },
  {
    studentId: 5,
    subject: "Anglais",
    coefficient: 3,
    grade: 13
  },
  {
    studentId: 5,
    subject: "Physique-Chimie",
    coefficient: 3,
    grade: 14
  },
  {
    studentId: 5,
    subject: "Sciences de la Vie",
    coefficient: 2,
    grade: 13
  },
  {
    studentId: 5,
    subject: "Histoire-Géographie",
    coefficient: 2,
    grade: 12
  },

  // Sophia - Form 1 B (GCE)
  {
    studentId: 6,
    subject: "English",
    coefficient: 4,
    grade: 16
  },
  {
    studentId: 6,
    subject: "Mathematics",
    coefficient: 4,
    grade: 15
  },
  {
    studentId: 6,
    subject: "Physics",
    coefficient: 3,
    grade: 14
  },
  {
    studentId: 6,
    subject: "Chemistry",
    coefficient: 3,
    grade: 13
  },
  {
    studentId: 6,
    subject: "Biology",
    coefficient: 2,
    grade: 14
  },
  {
    studentId: 6,
    subject: "Geography",
    coefficient: 2,
    grade: 12
  },

  // Yves - 3ème A (MINESEC)
  {
    studentId: 7,
    subject: "Mathématiques",
    coefficient: 4,
    grade: 19
  },
  {
    studentId: 7,
    subject: "Français",
    coefficient: 4,
    grade: 18
  },
  {
    studentId: 7,
    subject: "Anglais",
    coefficient: 3,
    grade: 16
  },
  {
    studentId: 7,
    subject: "Physique-Chimie",
    coefficient: 3,
    grade: 17
  },
  {
    studentId: 7,
    subject: "Sciences de la Vie",
    coefficient: 2,
    grade: 18
  },
  {
    studentId: 7,
    subject: "Histoire-Géographie",
    coefficient: 2,
    grade: 16
  },

  // Victoria - 2nde A (MINESEC)
  {
    studentId: 8,
    subject: "Mathématiques",
    coefficient: 4,
    grade: 17
  },
  {
    studentId: 8,
    subject: "Français",
    coefficient: 4,
    grade: 16
  },
  {
    studentId: 8,
    subject: "Anglais",
    coefficient: 3,
    grade: 14
  },
  {
    studentId: 8,
    subject: "Physique-Chimie",
    coefficient: 3,
    grade: 15
  },
  {
    studentId: 8,
    subject: "Sciences de la Vie",
    coefficient: 2,
    grade: 14
  },
  {
    studentId: 8,
    subject: "Histoire-Géographie",
    coefficient: 2,
    grade: 13
  },

  // Emmanuel - Lower Sixth A (GCE)
  {
    studentId: 9,
    subject: "English",
    coefficient: 4,
    grade: 17
  },
  {
    studentId: 9,
    subject: "Mathematics",
    coefficient: 4,
    grade: 16
  },
  {
    studentId: 9,
    subject: "Physics",
    coefficient: 3,
    grade: 15
  },
  {
    studentId: 9,
    subject: "Chemistry",
    coefficient: 3,
    grade: 14
  },
  {
    studentId: 9,
    subject: "Biology",
    coefficient: 2,
    grade: 13
  },
  {
    studentId: 9,
    subject: "Geography",
    coefficient: 2,
    grade: 12
  },

  // Christine - 1ère S (MINESEC)
  {
    studentId: 10,
    subject: "Mathématiques",
    coefficient: 5,
    grade: 16
  },
  {
    studentId: 10,
    subject: "Français",
    coefficient: 3,
    grade: 15
  },
  {
    studentId: 10,
    subject: "Anglais",
    coefficient: 2,
    grade: 13
  },
  {
    studentId: 10,
    subject: "Physique",
    coefficient: 4,
    grade: 14
  },
  {
    studentId: 10,
    subject: "Chimie",
    coefficient: 4,
    grade: 13
  },
  {
    studentId: 10,
    subject: "Sciences de la Vie",
    coefficient: 4,
    grade: 15
  },

  // Daniel - Upper Sixth A (GCE)
  {
    studentId: 11,
    subject: "English",
    coefficient: 4,
    grade: 18
  },
  {
    studentId: 11,
    subject: "Mathematics",
    coefficient: 5,
    grade: 19
  },
  {
    studentId: 11,
    subject: "Physics",
    coefficient: 4,
    grade: 18
  },
  {
    studentId: 11,
    subject: "Chemistry",
    coefficient: 4,
    grade: 17
  },
  {
    studentId: 11,
    subject: "Biology",
    coefficient: 3,
    grade: 16
  },

  // Laurence - Terminale D (MINESEC)
  {
    studentId: 12,
    subject: "Mathématiques",
    coefficient: 5,
    grade: 18
  },
  {
    studentId: 12,
    subject: "Français",
    coefficient: 3,
    grade: 17
  },
  {
    studentId: 12,
    subject: "Philosophie",
    coefficient: 3,
    grade: 16
  },
  {
    studentId: 12,
    subject: "Physique",
    coefficient: 4,
    grade: 16
  },
  {
    studentId: 12,
    subject: "Chimie",
    coefficient: 4,
    grade: 15
  },
  {
    studentId: 12,
    subject: "Sciences de la Vie",
    coefficient: 3,
    grade: 17
  }
]

// Présences - taux de présence par élève
export const attendance = [
  { studentId: 1, presentDays: 180, totalDays: 200, alerteAbsence: false },
  { studentId: 2, presentDays: 175, totalDays: 200, alerteAbsence: false },
  { studentId: 3, presentDays: 145, totalDays: 200, alerteAbsence: true }, // < 75%
  { studentId: 4, presentDays: 195, totalDays: 200, alerteAbsence: false },
  { studentId: 5, presentDays: 170, totalDays: 200, alerteAbsence: false },
  { studentId: 6, presentDays: 192, totalDays: 200, alerteAbsence: false },
  { studentId: 7, presentDays: 198, totalDays: 200, alerteAbsence: false },
  { studentId: 8, presentDays: 188, totalDays: 200, alerteAbsence: false },
  { studentId: 9, presentDays: 200, totalDays: 200, alerteAbsence: false },
  { studentId: 10, presentDays: 165, totalDays: 200, alerteAbsence: true }, // < 75%
  { studentId: 11, presentDays: 150, totalDays: 200, alerteAbsence: true }, // < 75%
  { studentId: 12, presentDays: 190, totalDays: 200, alerteAbsence: false }
]

// Personnel
export const staff = [
  {
    id: 1,
    firstName: "Dr. Jean-Claude",
    lastName: "Ngadjeu",
    position: "Directeur",
    salary: 500000,
    department: "Administration"
  },
  {
    id: 2,
    firstName: "Mme Marie",
    lastName: "Kombi",
    position: "Adjointe Administrative",
    salary: 200000,
    department: "Administration"
  },
  {
    id: 3,
    firstName: "M. Paul",
    lastName: "Mathurin",
    position: "Professeur Principal 6ème",
    salary: 300000,
    department: "Pédagogie"
  },
  {
    id: 4,
    firstName: "Mme Ines",
    lastName: "Ayissi",
    position: "Professeur Mathématiques",
    salary: 280000,
    department: "Pédagogie"
  },
  {
    id: 5,
    firstName: "Mr. Benjamin",
    lastName: "Nchanji",
    position: "Professeur Anglais",
    salary: 270000,
    department: "Pédagogie"
  }
]

// Paramètres - Grilles de frais
export const feeStructure = {
  MINESEC: {
    "6ème": { inscription: 80000, tranche1: 50000, tranche2: 50000, tranche3: 40000 },
    "5ème": { inscription: 80000, tranche1: 50000, tranche2: 50000, tranche3: 40000 },
    "4ème": { inscription: 90000, tranche1: 55000, tranche2: 55000, tranche3: 45000 },
    "3ème": { inscription: 95000, tranche1: 60000, tranche2: 60000, tranche3: 50000 },
    "2nde": { inscription: 100000, tranche1: 65000, tranche2: 65000, tranche3: 55000 },
    "1ère": { inscription: 110000, tranche1: 70000, tranche2: 70000, tranche3: 60000 },
    "Terminale": { inscription: 115000, tranche1: 75000, tranche2: 75000, tranche3: 65000 }
  },
  GCE: {
    "Form 1": { inscription: 100000, tranche1: 60000, tranche2: 60000, tranche3: 50000 },
    "Form 2": { inscription: 100000, tranche1: 60000, tranche2: 60000, tranche3: 50000 },
    "Form 3": { inscription: 100000, tranche1: 65000, tranche2: 65000, tranche3: 55000 },
    "Form 4": { inscription: 110000, tranche1: 70000, tranche2: 70000, tranche3: 60000 },
    "Form 5": { inscription: 110000, tranche1: 75000, tranche2: 75000, tranche3: 65000 },
    "Lower Sixth": { inscription: 120000, tranche1: 80000, tranche2: 80000, tranche3: 70000 },
    "Upper Sixth": { inscription: 130000, tranche1: 85000, tranche2: 85000, tranche3: 75000 }
  }
}

// Méthodes de paiement supportées
export const paymentMethods = [
  { id: 1, name: "Orange Money", color: "bg-orange-500" },
  { id: 2, name: "MTN MoMo", color: "bg-yellow-500" },
  { id: 3, name: "Wave", color: "bg-blue-500" },
  { id: 4, name: "Espèces", color: "bg-green-500" },
  { id: 5, name: "Virement Bancaire", color: "bg-purple-500" }
]

// Barème de notation
export const gradingScale = [
  { min: 0, max: 9.99, mention: "Insuffisant", color: "red" },
  { min: 10, max: 12.99, mention: "Passable", color: "orange" },
  { min: 13, max: 14.99, mention: "Assez Bien", color: "yellow" },
  { min: 15, max: 17.99, mention: "Bien", color: "blue" },
  { min: 18, max: 20, mention: "Très Bien", color: "green" }
]
