import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

// Seed de PRODUCTION : structure réelle du client (écoles, classes, matières,
// comptes) sans aucune donnée factice (pas d'élève, pas de dépense, pas de
// note/présence de démo). À exécuter UNE SEULE FOIS sur une base vide.
async function main() {
  console.log('🌱 Seed production : structure réelle, base propre...')

  const ecoles = await Promise.all([
    prisma.ecole.create({
      data: {
        nomCourt: 'CRP_FRANCOPHONE',
        nomComplet: 'Collège Rosa Parks francophone',
        niveau: 'SECONDAIRE',
        adresse: 'Yaoundé, Cameroun',
        telephone: '+237 6 XX XXX XXXX',
        email: 'crp-francophone@school.cm'
      }
    }),
    prisma.ecole.create({
      data: {
        nomCourt: 'CRP_ANGLOPHONE',
        nomComplet: 'Collège Rosa Parks anglophone',
        niveau: 'SECONDAIRE',
        adresse: 'Yaoundé, Cameroun',
        telephone: '+237 6 XX XXX XXXX',
        email: 'crp-anglophone@school.cm'
      }
    }),
    prisma.ecole.create({
      data: {
        nomCourt: 'CRP_TECHNIQUE',
        nomComplet: 'Collège Rosa Parks technique',
        niveau: 'SECONDAIRE',
        adresse: 'Yaoundé, Cameroun',
        telephone: '+237 6 XX XXX XXXX',
        email: 'crp-technique@school.cm'
      }
    }),
    prisma.ecole.create({
      data: {
        nomCourt: 'CBM',
        nomComplet: 'Collège bilingue les Master',
        niveau: 'SECONDAIRE',
        adresse: 'Yaoundé, Cameroun',
        telephone: '+237 6 XX XXX XXXX',
        email: 'cbm@school.cm'
      }
    }),
    prisma.ecole.create({
      data: {
        nomCourt: 'EBSB',
        nomComplet: 'École bilingue Steve Biko',
        niveau: 'MATERNELLE_PRIMAIRE',
        adresse: 'Yaoundé, Cameroun',
        telephone: '+237 6 XX XXX XXXX',
        email: 'ebsb@school.cm'
      }
    }),
    prisma.ecole.create({
      data: {
        nomCourt: 'EBRP',
        nomComplet: 'École bilingue Rosa Parks',
        niveau: 'MATERNELLE_PRIMAIRE',
        adresse: 'Yaoundé, Cameroun',
        telephone: '+237 6 XX XXX XXXX',
        email: 'ebrp@school.cm'
      }
    })
  ])
  const [francophone, anglophone, technique, cbm, ebsb, ebrp] = ecoles
  console.log('✓ 6 écoles créées')

  // ===== COMPTES — organisation réelle communiquée par le client =====
  const creerCompte = async ({ email, nom, role, fonction }) => {
    const localPart = email.split('@')[0]
    const motDePasse = await bcryptjs.hash(`${localPart}2026`, 10)
    return prisma.utilisateur.create({
      data: {
        nom,
        email,
        motDePasse,
        role,
        fonction: fonction || null,
        actif: true,
        ...(role === 'ENSEIGNANT' && { enseignant: { create: { telephone: '' } } })
      }
    })
  }

  const admin = await creerCompte({ email: 'admin@gestionschool.cm', nom: 'Administrateur', role: 'SUPER_ADMIN' })
  const principal1 = await creerCompte({ email: 'principal1@gestionschool.cm', nom: 'Principal - CRP Francophone & CBM', role: 'PRINCIPAL' })
  const principal2 = await creerCompte({ email: 'principal2@gestionschool.cm', nom: 'Principal - CRP Anglophone', role: 'PRINCIPAL' })
  const principal3 = await creerCompte({ email: 'principal3@gestionschool.cm', nom: 'Principal - CRP Technique', role: 'PRINCIPAL' })
  const directrice = await creerCompte({ email: 'directrice@gestionschool.cm', nom: 'Directrice - EBSB & EBRP', role: 'DIRECTRICE' })
  const secretaire1 = await creerCompte({ email: 'secretaire1@gestionschool.cm', nom: 'Secrétaire - CRP Franco/Anglo/Technique & EBRP', role: 'SECRETAIRE' })
  const secretaire2 = await creerCompte({ email: 'secretaire2@gestionschool.cm', nom: 'Secrétaire - CBM', role: 'SECRETAIRE' })
  const secretaire3 = await creerCompte({ email: 'secretaire3@gestionschool.cm', nom: 'Secrétaire - EBSB', role: 'SECRETAIRE' })
  const surveillant1 = await creerCompte({ email: 'surveillant1@gestionschool.cm', nom: 'Surveillant Général - CRP Francophone & Technique', role: 'SURVEILLANT_GENERAL' })
  const surveillant2 = await creerCompte({ email: 'surveillant2@gestionschool.cm', nom: 'Surveillant Général - CRP Anglophone', role: 'SURVEILLANT_GENERAL' })
  const surveillant3 = await creerCompte({ email: 'surveillant3@gestionschool.cm', nom: 'Surveillant Général - CBM', role: 'SURVEILLANT_GENERAL' })
  const economat = await creerCompte({ email: 'economat@gestionschool.cm', nom: 'Économat', role: 'ECONOMAT' })

  const enseignants = await Promise.all(
    ecoles.map((_, i) => creerCompte({ email: `enseignant${i + 1}@gestionschool.cm`, nom: `Enseignant - ${ecoles[i].nomCourt}`, role: 'ENSEIGNANT' }))
  )

  console.log('✓ Comptes créés')

  const lierEcoles = (utilisateur, ecolesListe, role) =>
    Promise.all(ecolesListe.map(ecole =>
      prisma.utilisateurEcole.create({ data: { utilisateurId: utilisateur.id, ecoleId: ecole.id, role } })
    ))

  await Promise.all([
    ...ecoles.map(ecole => prisma.utilisateurEcole.create({ data: { utilisateurId: admin.id, ecoleId: ecole.id, role: 'SUPER_ADMIN' } })),
    lierEcoles(principal1, [francophone, cbm], 'PRINCIPAL'),
    lierEcoles(principal2, [anglophone], 'PRINCIPAL'),
    lierEcoles(principal3, [technique], 'PRINCIPAL'),
    lierEcoles(directrice, [ebsb, ebrp], 'DIRECTRICE'),
    lierEcoles(secretaire1, [francophone, anglophone, technique, ebrp], 'SECRETAIRE'),
    lierEcoles(secretaire2, [cbm], 'SECRETAIRE'),
    lierEcoles(secretaire3, [ebsb], 'SECRETAIRE'),
    lierEcoles(surveillant1, [francophone, technique], 'SURVEILLANT_GENERAL'),
    lierEcoles(surveillant2, [anglophone], 'SURVEILLANT_GENERAL'),
    lierEcoles(surveillant3, [cbm], 'SURVEILLANT_GENERAL'),
    ...ecoles.map(ecole => prisma.utilisateurEcole.create({ data: { utilisateurId: economat.id, ecoleId: ecole.id, role: 'ECONOMAT' } })),
    ...enseignants.map((ens, i) => prisma.utilisateurEcole.create({ data: { utilisateurId: ens.id, ecoleId: ecoles[i].id, role: 'ENSEIGNANT' } }))
  ])

  console.log('✓ Comptes reliés à leurs écoles')

  // ===== Classes (structure camerounaise réelle, inchangée) =====
  const classesMap = {}
  const classConfig = {
    'CRP_FRANCOPHONE': [
      { nom: '6ème A', niveau: '6ème' }, { nom: '6ème B', niveau: '6ème' },
      { nom: '5ème A', niveau: '5ème' }, { nom: '5ème B', niveau: '5ème' },
      { nom: '4ème A', niveau: '4ème' }, { nom: '4ème B', niveau: '4ème' },
      { nom: '3ème A', niveau: '3ème' }, { nom: '3ème B', niveau: '3ème' }
    ],
    'CRP_ANGLOPHONE': [
      { nom: 'Form 1 A', niveau: 'Form 1' }, { nom: 'Form 1 B', niveau: 'Form 1' },
      { nom: 'Form 2 A', niveau: 'Form 2' }, { nom: 'Form 2 B', niveau: 'Form 2' },
      { nom: 'Form 3 A', niveau: 'Form 3' }, { nom: 'Form 3 B', niveau: 'Form 3' },
      { nom: 'Form 4 A', niveau: 'Form 4' }, { nom: 'Form 4 B', niveau: 'Form 4' },
      { nom: 'Form 5 A', niveau: 'Form 5' }, { nom: 'Form 5 B', niveau: 'Form 5' }
    ],
    'CRP_TECHNIQUE': [
      { nom: '1ère année A', niveau: '1ère année' }, { nom: '1ère année B', niveau: '1ère année' },
      { nom: '2ème année A', niveau: '2ème année' }, { nom: '2ème année B', niveau: '2ème année' }
    ],
    'CBM': [
      { nom: '6ème A', niveau: '6ème' }, { nom: '6ème B', niveau: '6ème' },
      { nom: '5ème A', niveau: '5ème' }, { nom: '5ème B', niveau: '5ème' },
      { nom: '4ème A', niveau: '4ème' }, { nom: '4ème B', niveau: '4ème' },
      { nom: '3ème A', niveau: '3ème' }, { nom: '3ème B', niveau: '3ème' }
    ],
    'EBSB': [
      { nom: 'Petite Section A', niveau: 'PS' }, { nom: 'Petite Section B', niveau: 'PS' },
      { nom: 'Moyenne Section A', niveau: 'MS' }, { nom: 'Moyenne Section B', niveau: 'MS' },
      { nom: 'Grande Section A', niveau: 'GS' }, { nom: 'Grande Section B', niveau: 'GS' },
      { nom: 'SIL A', niveau: 'SIL' }, { nom: 'SIL B', niveau: 'SIL' },
      { nom: 'CP A', niveau: 'CP' }, { nom: 'CP B', niveau: 'CP' },
      { nom: 'CE1 A', niveau: 'CE1' }, { nom: 'CE1 B', niveau: 'CE1' },
      { nom: 'CE2 A', niveau: 'CE2' }, { nom: 'CE2 B', niveau: 'CE2' },
      { nom: 'CM1 A', niveau: 'CM1' }, { nom: 'CM1 B', niveau: 'CM1' },
      { nom: 'CM2 A', niveau: 'CM2' }, { nom: 'CM2 B', niveau: 'CM2' }
    ],
    'EBRP': [
      { nom: 'Petite Section A', niveau: 'PS' }, { nom: 'Petite Section B', niveau: 'PS' },
      { nom: 'Moyenne Section A', niveau: 'MS' }, { nom: 'Moyenne Section B', niveau: 'MS' },
      { nom: 'Grande Section A', niveau: 'GS' }, { nom: 'Grande Section B', niveau: 'GS' },
      { nom: 'SIL A', niveau: 'SIL' }, { nom: 'SIL B', niveau: 'SIL' },
      { nom: 'CP A', niveau: 'CP' }, { nom: 'CP B', niveau: 'CP' },
      { nom: 'CE1 A', niveau: 'CE1' }, { nom: 'CE1 B', niveau: 'CE1' },
      { nom: 'CE2 A', niveau: 'CE2' }, { nom: 'CE2 B', niveau: 'CE2' },
      { nom: 'CM1 A', niveau: 'CM1' }, { nom: 'CM1 B', niveau: 'CM1' },
      { nom: 'CM2 A', niveau: 'CM2' }, { nom: 'CM2 B', niveau: 'CM2' }
    ]
  }

  for (const ecole of ecoles) {
    classesMap[ecole.nomCourt] = []
    const config = classConfig[ecole.nomCourt] || []
    for (const classeConfig of config) {
      const classe = await prisma.classe.create({
        data: { nom: classeConfig.nom, niveau: classeConfig.niveau, ecoleId: ecole.id }
      })
      classesMap[ecole.nomCourt].push(classe)
    }
  }
  console.log('✓ Classes créées')

  // ===== Matières =====
  const matieresFrancophone = ['Mathématiques', 'Français', 'Sciences', 'Anglais', 'Histoire-Géo', 'EPS']
  const matieresAnglophone = ['English', 'Mathematics', 'Sciences', 'French', 'History-Geography', 'Sports']
  const matieresTechnique = ['Technologie', 'Informatique', 'Mathématiques', 'Sciences', 'Dessin Technique', 'EPS']
  const matieresPrimaire = ['Français', 'Mathématiques', 'Sciences', 'Histoire-Géo', 'EPS', 'Dessin']

  for (const ecole of ecoles) {
    let matieres
    if (ecole.nomCourt === 'CRP_FRANCOPHONE') matieres = matieresFrancophone
    else if (ecole.nomCourt === 'CRP_ANGLOPHONE') matieres = matieresAnglophone
    else if (ecole.nomCourt === 'CRP_TECHNIQUE') matieres = matieresTechnique
    else if (ecole.nomCourt === 'CBM') matieres = matieresFrancophone
    else matieres = matieresPrimaire

    for (const nomMatiere of matieres) {
      await prisma.matiere.create({ data: { nom: nomMatiere, ecoleId: ecole.id, coefficient: 3 } })
    }
  }
  console.log('✓ Matières créées')

  // ===== Configuration des frais (à ajuster par le client si besoin) =====
  for (const ecole of ecoles) {
    await prisma.configurationFrais.create({
      data: {
        ecoleId: ecole.id,
        montantInscription: 50000,
        montantFraisTotal: 800000,
        dateLimiteInscription: new Date('2026-09-15'),
        tranches: {
          create: [
            { numero: 1, montant: 300000, dateLimite: new Date('2026-10-31') },
            { numero: 2, montant: 250000, dateLimite: new Date('2027-01-31') },
            { numero: 3, montant: 250000, dateLimite: new Date('2027-04-30') }
          ]
        }
      }
    })
  }
  console.log('✓ Configuration des frais créée (montants par défaut — à ajuster si nécessaire)')

  console.log('✅ Seed production terminé : structure réelle en place, aucune donnée factice.')
}

main()
  .catch(e => {
    console.error('❌ Erreur seed production:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
