import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed: Création des données de démo enrichies...')

  // Nettoyer les données existantes
  await prisma.presence.deleteMany()
  await prisma.note.deleteMany()
  await prisma.enseignantClasseMatiere.deleteMany()
  await prisma.tranche.deleteMany()
  await prisma.configurationFrais.deleteMany()
  await prisma.matiere.deleteMany()
  await prisma.inscriptionFrais.deleteMany()
  await prisma.eleve.deleteMany()
  await prisma.classe.deleteMany()
  await prisma.enseignant.deleteMany()
  await prisma.utilisateur.deleteMany()
  await prisma.personnel.deleteMany()
  await prisma.finance.deleteMany()
  await prisma.parametres.deleteMany()
  await prisma.section.deleteMany()
  await prisma.ecole.deleteMany()

  console.log('✓ Tables vidées')

  // Créer l'école
  const ecole = await prisma.ecole.create({
    data: {
      nom: 'Collège Rosa-Parks',
      lieu: 'Yaoundé, Cameroun',
      telephone: '+237 6 XX XXX XXXX',
      email: 'info@collegerosparks.cm',
      anneeScolaireEnCours: '2024-2025'
    }
  })

  console.log('✓ École créée')

  // Créer les sections par défaut avec IDs fixes pour compatibilité
  const sections = await Promise.all([
    prisma.section.create({
      data: {
        id: 'FRANCOPHONE',
        nom: 'Francophone',
        emoji: '🇫🇷',
        ordre: 1
      }
    }),
    prisma.section.create({
      data: {
        id: 'ANGLOPHONE',
        nom: 'Anglophone',
        emoji: '🇬🇧',
        ordre: 2
      }
    }),
    prisma.section.create({
      data: {
        id: 'TECHNIQUE',
        nom: 'Technique',
        emoji: '⚙️',
        ordre: 3
      }
    })
  ])

  console.log('✓ 3 Sections créées')

  // Créer les matières par section
  const matieres = await Promise.all([
    // FRANCOPHONE
    prisma.matiere.create({ data: { nom: 'Mathématiques', sectionId: 'FRANCOPHONE', coefficient: 4 } }),
    prisma.matiere.create({ data: { nom: 'Français', sectionId: 'FRANCOPHONE', coefficient: 3 } }),
    prisma.matiere.create({ data: { nom: 'Sciences', sectionId: 'FRANCOPHONE', coefficient: 3 } }),
    // ANGLOPHONE
    prisma.matiere.create({ data: { nom: 'English', sectionId: 'ANGLOPHONE', coefficient: 4 } }),
    prisma.matiere.create({ data: { nom: 'Mathematics', sectionId: 'ANGLOPHONE', coefficient: 4 } }),
    // TECHNIQUE
    prisma.matiere.create({ data: { nom: 'Technologie', sectionId: 'TECHNIQUE', coefficient: 4 } }),
    prisma.matiere.create({ data: { nom: 'Informatique', sectionId: 'TECHNIQUE', coefficient: 3 } })
  ])

  console.log('✓ 7 Matières créées')

  // Créer les configurations de frais par section
  const configFrais = await Promise.all([
    prisma.configurationFrais.create({
      data: {
        sectionId: 'FRANCOPHONE',
        montantInscription: 50000,
        montantFraisTotal: 80000,
        tranches: {
          create: [
            { numero: 1, montant: 30000 },
            { numero: 2, montant: 25000 },
            { numero: 3, montant: 25000 }
          ]
        }
      }
    }),
    prisma.configurationFrais.create({
      data: {
        sectionId: 'ANGLOPHONE',
        montantInscription: 55000,
        montantFraisTotal: 85000,
        tranches: {
          create: [
            { numero: 1, montant: 30000 },
            { numero: 2, montant: 30000 },
            { numero: 3, montant: 25000 }
          ]
        }
      }
    }),
    prisma.configurationFrais.create({
      data: {
        sectionId: 'TECHNIQUE',
        montantInscription: 45000,
        montantFraisTotal: 75000,
        tranches: {
          create: [
            { numero: 1, montant: 40000 },
            { numero: 2, montant: 35000 }
          ]
        }
      }
    })
  ])

  console.log('✓ Configurations de frais créées')

  // Créer les utilisateurs
  const hashPassword = async (pwd) => bcryptjs.hash(pwd, 10)

  const utilisateurs = await Promise.all([
    prisma.utilisateur.create({
      data: {
        nom: 'Michel Manga',
        email: 'michelmanga941@gmail.com',
        motDePasse: await hashPassword('demo123'),
        role: 'PROPRIETAIRE'
      }
    }),
    prisma.utilisateur.create({
      data: {
        nom: 'Guy Mbakop Roger',
        email: 'yves@school.cm',
        motDePasse: await hashPassword('demo123'),
        role: 'DIRECTEUR'
      }
    }),
    prisma.utilisateur.create({
      data: {
        nom: 'Mme Marie AYISSI',
        email: 'marie@school.cm',
        motDePasse: await hashPassword('demo123'),
        role: 'SECRETAIRE'
      }
    }),
    prisma.utilisateur.create({
      data: {
        nom: 'Mme Inès AYISSI',
        email: 'ines.math@school.cm',
        motDePasse: await hashPassword('demo123'),
        role: 'ENSEIGNANT'
      }
    }),
    prisma.utilisateur.create({
      data: {
        nom: 'Mr. Benjamin NCHANJI',
        email: 'benjamin.english@school.cm',
        motDePasse: await hashPassword('demo123'),
        role: 'ENSEIGNANT'
      }
    })
  ])

  console.log('✓ 5 Utilisateurs créés')

  // Créer les enseignants
  const enseignants = await Promise.all([
    prisma.enseignant.create({
      data: {
        utilisateurId: utilisateurs[3].id,
        telephone: '+237 690 123 456',
        dateEmbauche: new Date('2023-09-01')
      }
    }),
    prisma.enseignant.create({
      data: {
        utilisateurId: utilisateurs[4].id,
        telephone: '+237 691 234 567',
        dateEmbauche: new Date('2023-09-01')
      }
    })
  ])

  console.log('✓ Enseignants créés')

  // Créer 8 classes (3 sections)
  const classes = await Promise.all([
    // FRANCOPHONE (3 classes)
    prisma.classe.create({ data: { nom: '6ème A', section: 'FRANCOPHONE', sectionId: 'FRANCOPHONE', niveau: '6ème' } }),
    prisma.classe.create({ data: { nom: '5ème B', section: 'FRANCOPHONE', sectionId: 'FRANCOPHONE', niveau: '5ème' } }),
    prisma.classe.create({ data: { nom: '3ème A', section: 'FRANCOPHONE', sectionId: 'FRANCOPHONE', niveau: '3ème' } }),
    // ANGLOPHONE (2 classes)
    prisma.classe.create({ data: { nom: 'Form 1 A', section: 'ANGLOPHONE', sectionId: 'ANGLOPHONE', niveau: 'Form 1' } }),
    prisma.classe.create({ data: { nom: 'Form 3 B', section: 'ANGLOPHONE', sectionId: 'ANGLOPHONE', niveau: 'Form 3' } }),
    // TECHNIQUE (2 classes)
    prisma.classe.create({ data: { nom: '2nde Maintenance', section: 'TECHNIQUE', sectionId: 'TECHNIQUE', niveau: '2nde' } }),
    prisma.classe.create({ data: { nom: 'Terminale Electro', section: 'TECHNIQUE', sectionId: 'TECHNIQUE', niveau: 'Terminale' } })
  ])

  console.log('✓ 8 Classes créées')

  // Lier enseignants aux classes et matieres
  // matieres[0] = Mathématiques (FRANCOPHONE)
  // matieres[1] = Français (FRANCOPHONE)
  // matieres[2] = Sciences (FRANCOPHONE)
  // matieres[3] = English (ANGLOPHONE)
  // matieres[4] = Mathematics (ANGLOPHONE)
  // matieres[5] = Technologie (TECHNIQUE)
  // matieres[6] = Informatique (TECHNIQUE)

  await Promise.all([
    // Math - Inès (FRANCOPHONE)
    prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignants[0].id, classeId: classes[0].id, matiereId: matieres[0].id }
    }),
    prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignants[0].id, classeId: classes[1].id, matiereId: matieres[0].id }
    }),
    prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignants[0].id, classeId: classes[2].id, matiereId: matieres[0].id }
    }),
    // English - Benjamin (ANGLOPHONE)
    prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignants[1].id, classeId: classes[3].id, matiereId: matieres[3].id }
    }),
    prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignants[1].id, classeId: classes[4].id, matiereId: matieres[3].id }
    }),
    // Technologie - Benjamin (TECHNIQUE)
    prisma.enseignantClasseMatiere.create({
      data: { enseignantId: enseignants[1].id, classeId: classes[5].id, matiereId: matieres[5].id }
    })
  ])

  console.log('✓ Affectations enseignant-classe-matiere créées')

  // Créer 30 élèves répartis réalistement
  const eleves = await Promise.all([
    // 6ème A (8 élèves)
    prisma.eleve.create({
      data: {
        matricule: 'MAT001',
        nom: 'KENGNI', prenom: 'Nadia', sexe: 'FEMININ',
        dateNaissance: new Date('2012-05-15'),
        classeId: classes[0].id,
        nomParent: 'M. Jean KENGNI', lieuParente: 'Père',
        telephoneParent: '+237 670 123 456', adresseParent: 'Yaoundé, Bastos'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT002',
        nom: 'NGUEMA', prenom: 'Alain', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-08-22'),
        classeId: classes[0].id,
        nomParent: 'Mme Sylvie NGUEMA', lieuParente: 'Mère',
        telephoneParent: '+237 671 234 567', adresseParent: 'Yaoundé, Nlongkak'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT003',
        nom: 'TCHINDA', prenom: 'Ange', sexe: 'FEMININ',
        dateNaissance: new Date('2013-02-10'),
        classeId: classes[0].id,
        nomParent: 'Dr. Michel TCHINDA', lieuParente: 'Père',
        telephoneParent: '+237 672 345 678'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT004',
        nom: 'MBALLA', prenom: 'Léopold', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-11-03'),
        classeId: classes[0].id,
        nomParent: 'M. Paul MBALLA', lieuParente: 'Père',
        telephoneParent: '+237 673 456 789'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT005',
        nom: 'KAMENI', prenom: 'Jessica', sexe: 'FEMININ',
        dateNaissance: new Date('2012-07-14'),
        classeId: classes[0].id,
        nomParent: 'Mme Hélène KAMENI', lieuParente: 'Mère',
        telephoneParent: '+237 674 567 890'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT006',
        nom: 'SONGA', prenom: 'Marc', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-09-25'),
        classeId: classes[0].id,
        nomParent: 'M. Xavier SONGA', lieuParente: 'Père',
        telephoneParent: '+237 675 678 901'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT007',
        nom: 'LIPOGO', prenom: 'Valérie', sexe: 'FEMININ',
        dateNaissance: new Date('2012-04-18'),
        classeId: classes[0].id,
        nomParent: 'Mme Françoise LIPOGO', lieuParente: 'Mère',
        telephoneParent: '+237 676 789 012'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT008',
        nom: 'NZOMO', prenom: 'David', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-12-05'),
        classeId: classes[0].id,
        nomParent: 'M. Roger NZOMO', lieuParente: 'Père',
        telephoneParent: '+237 677 890 123', adresseParent: 'Yaoundé, Emombo'
      }
    }),

    // 5ème B (7 élèves)
    prisma.eleve.create({
      data: {
        matricule: 'MAT009',
        nom: 'BAH', prenom: 'Amina', sexe: 'FEMININ',
        dateNaissance: new Date('2011-03-10'),
        classeId: classes[1].id,
        nomParent: 'M. Ibrahim BAH', lieuParente: 'Père',
        telephoneParent: '+237 678 345 678'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT010',
        nom: 'FONGCHOE', prenom: 'Hervé', sexe: 'MASCULIN',
        dateNaissance: new Date('2011-06-20'),
        classeId: classes[1].id,
        nomParent: 'M. Antoine FONGCHOE', lieuParente: 'Père',
        telephoneParent: '+237 679 456 789'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT011',
        nom: 'MVOGO', prenom: 'Christelle', sexe: 'FEMININ',
        dateNaissance: new Date('2011-01-28'),
        classeId: classes[1].id,
        nomParent: 'Mme Christine MVOGO', lieuParente: 'Mère',
        telephoneParent: '+237 680 567 890'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT012',
        nom: 'ETOUNDI', prenom: 'Stéphane', sexe: 'MASCULIN',
        dateNaissance: new Date('2011-09-15'),
        classeId: classes[1].id,
        nomParent: 'M. Luc ETOUNDI', lieuParente: 'Père',
        telephoneParent: '+237 681 678 901'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT013',
        nom: 'DIEUDONNE', prenom: 'Laure', sexe: 'FEMININ',
        dateNaissance: new Date('2011-05-02'),
        classeId: classes[1].id,
        nomParent: 'M. Christophe DIEUDONNE', lieuParente: 'Père',
        telephoneParent: '+237 682 789 012'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT014',
        nom: 'KEMAYOU', prenom: 'Noël', sexe: 'MASCULIN',
        dateNaissance: new Date('2011-11-08'),
        classeId: classes[1].id,
        nomParent: 'M. Serge KEMAYOU', lieuParente: 'Père',
        telephoneParent: '+237 683 890 123'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT015',
        nom: 'KAMGA', prenom: 'Sophie', sexe: 'FEMININ',
        dateNaissance: new Date('2011-07-12'),
        classeId: classes[1].id,
        nomParent: 'Mme Bernadette KAMGA', lieuParente: 'Mère',
        telephoneParent: '+237 684 901 234'
      }
    }),

    // 3ème A (6 élèves)
    prisma.eleve.create({
      data: {
        matricule: 'MAT016',
        nom: 'DONGMO', prenom: 'Cédric', sexe: 'MASCULIN',
        dateNaissance: new Date('2010-04-20'),
        classeId: classes[2].id,
        nomParent: 'M. Bernard DONGMO', lieuParente: 'Père',
        telephoneParent: '+237 685 012 345'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT017',
        nom: 'NKOMA', prenom: 'Sandrine', sexe: 'FEMININ',
        dateNaissance: new Date('2010-08-14'),
        classeId: classes[2].id,
        nomParent: 'Mme Marthe NKOMA', lieuParente: 'Mère',
        telephoneParent: '+237 686 123 456'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT018',
        nom: 'ENYE', prenom: 'Olivier', sexe: 'MASCULIN',
        dateNaissance: new Date('2010-02-09'),
        classeId: classes[2].id,
        nomParent: 'M. Denis ENYE', lieuParente: 'Père',
        telephoneParent: '+237 687 234 567'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT019',
        nom: 'MAKONDE', prenom: 'Fabrice', sexe: 'MASCULIN',
        dateNaissance: new Date('2010-10-17'),
        classeId: classes[2].id,
        nomParent: 'M. Raoul MAKONDE', lieuParente: 'Père',
        telephoneParent: '+237 688 345 678'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT020',
        nom: 'FOTSO', prenom: 'Nadège', sexe: 'FEMININ',
        dateNaissance: new Date('2010-06-23'),
        classeId: classes[2].id,
        nomParent: 'M. Armand FOTSO', lieuParente: 'Père',
        telephoneParent: '+237 689 456 789'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT021',
        nom: 'ANGOUA', prenom: 'Fabien', sexe: 'MASCULIN',
        dateNaissance: new Date('2010-12-30'),
        classeId: classes[2].id,
        nomParent: 'M. Gérard ANGOUA', lieuParente: 'Père',
        telephoneParent: '+237 690 567 890'
      }
    }),

    // Form 1 A (5 élèves)
    prisma.eleve.create({
      data: {
        matricule: 'MAT022',
        nom: 'NKONGA', prenom: 'Marcus', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-08-20'),
        classeId: classes[3].id,
        nomParent: 'Mrs. Angela NKONGA', lieuParente: 'Mère',
        telephoneParent: '+237 675 234 567'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT023',
        nom: 'SANDA', prenom: 'Precious', sexe: 'FEMININ',
        dateNaissance: new Date('2012-03-15'),
        classeId: classes[3].id,
        nomParent: 'Mr. Francis SANDA', lieuParente: 'Père',
        telephoneParent: '+237 676 345 678'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT024',
        nom: 'MBUAGBAW', prenom: 'Andrew', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-11-07'),
        classeId: classes[3].id,
        nomParent: 'Mr. Timothy MBUAGBAW', lieuParente: 'Père',
        telephoneParent: '+237 677 456 789'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT025',
        nom: 'CHIA', prenom: 'Renée', sexe: 'FEMININ',
        dateNaissance: new Date('2012-09-28'),
        classeId: classes[3].id,
        nomParent: 'Mrs. Sylvia CHIA', lieuParente: 'Mère',
        telephoneParent: '+237 678 567 890'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT026',
        nom: 'FONGOH', prenom: 'Kevin', sexe: 'MASCULIN',
        dateNaissance: new Date('2012-05-12'),
        classeId: classes[3].id,
        nomParent: 'Mr. Samuel FONGOH', lieuParente: 'Père',
        telephoneParent: '+237 679 678 901'
      }
    }),

    // Form 3 B (4 élèves)
    prisma.eleve.create({
      data: {
        matricule: 'MAT027',
        nom: 'AGBOR', prenom: 'Vivian', sexe: 'FEMININ',
        dateNaissance: new Date('2010-07-19'),
        classeId: classes[4].id,
        nomParent: 'Mrs. Margaret AGBOR', lieuParente: 'Mère',
        telephoneParent: '+237 680 789 012'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT028',
        nom: 'NJOH', prenom: 'Clement', sexe: 'MASCULIN',
        dateNaissance: new Date('2010-02-25'),
        classeId: classes[4].id,
        nomParent: 'Mr. Edward NJOH', lieuParente: 'Père',
        telephoneParent: '+237 681 890 123'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT029',
        nom: 'NGONDA', prenom: 'Linda', sexe: 'FEMININ',
        dateNaissance: new Date('2010-10-11'),
        classeId: classes[4].id,
        nomParent: 'Mr. Joseph NGONDA', lieuParente: 'Père',
        telephoneParent: '+237 682 901 234'
      }
    }),
    prisma.eleve.create({
      data: {
        matricule: 'MAT030',
        nom: 'MUAMBI', prenom: 'Richard', sexe: 'MASCULIN',
        dateNaissance: new Date('2010-06-03'),
        classeId: classes[4].id,
        nomParent: 'Mr. Victor MUAMBI', lieuParente: 'Père',
        telephoneParent: '+237 683 012 345'
      }
    })
  ])

  console.log('✓ 30 Élèves créés')

  // Créer les frais pour tous les élèves (mix de statuts)
  const feeData = eleves.map((eleve, idx) => {
    let statut = 'SOLDE'
    let montantPaye = 80000
    if (idx % 5 === 0) {
      statut = 'IMPAYE'
      montantPaye = 0
    } else if (idx % 3 === 0) {
      statut = 'PARTIEL'
      montantPaye = 50000
    }
    return {
      eleveId: eleve.id,
      tranche: 'inscription',
      montantDu: 80000,
      montantPaye,
      statut,
      statutValidation: 'BROUILLON'
    }
  })

  await prisma.inscriptionFrais.createMany({ data: feeData })
  console.log('✓ Frais créés pour tous les élèves')

  // Créer du personnel
  await Promise.all([
    prisma.personnel.create({
      data: {
        ecoleId: ecole.id,
        nom: 'Dr. Jean-Claude NGADJEU',
        fonction: 'Directeur General',
        telephone: '+237 699 999 999',
        salaireMensuel: 750000,
        dateEmbauche: new Date('2020-01-15')
      }
    }),
    prisma.personnel.create({
      data: {
        ecoleId: ecole.id,
        nom: 'Mme Alice MAKOTO',
        fonction: 'Comptable',
        telephone: '+237 690 000 001',
        salaireMensuel: 450000,
        dateEmbauche: new Date('2021-06-10')
      }
    }),
    prisma.personnel.create({
      data: {
        ecoleId: ecole.id,
        nom: 'M. Henri TEKAM',
        fonction: 'Agent d\'entretien',
        telephone: '+237 691 000 002',
        salaireMensuel: 200000,
        dateEmbauche: new Date('2022-03-20')
      }
    }),
    prisma.personnel.create({
      data: {
        ecoleId: ecole.id,
        nom: 'Mme Rose BIKOMO',
        fonction: 'Secrétaire Générale',
        telephone: '+237 692 000 003',
        salaireMensuel: 300000,
        dateEmbauche: new Date('2021-09-01')
      }
    }),
    prisma.personnel.create({
      data: {
        ecoleId: ecole.id,
        nom: 'M. David NKENE',
        fonction: 'Surveillant',
        telephone: '+237 693 000 004',
        salaireMensuel: 250000,
        dateEmbauche: new Date('2023-01-15')
      }
    })
  ])

  console.log('✓ Personnel créé')

  // Créer des paramètres
  await prisma.parametres.create({
    data: {
      ecoleId: ecole.id,
      baremeNotation: JSON.stringify({
        'Insuffisant': { min: 0, max: 10 },
        'Passable': { min: 10, max: 13 },
        'Assez Bien': { min: 13, max: 15 },
        'Bien': { min: 15, max: 18 },
        'Tres Bien': { min: 18, max: 20 }
      }),
      echances: JSON.stringify({
        'inscription': '2024-09-01',
        'tranche1': '2024-10-01',
        'tranche2': '2024-12-01',
        'tranche3': '2025-02-01'
      })
    }
  })

  console.log('✓ Paramètres créés')

  console.log('✅ Seed enrichie complétée avec succès!')
  console.log('\n📊 Statistiques:')
  console.log('- 8 classes (3 Francophone, 2 Anglophone, 2 Technique)')
  console.log('- 30 élèves répartis réalistement')
  console.log('- Mix de statuts de paiement (Solde, Partiel, Impaye)')
  console.log('- 5 membres du personnel avec salaires variés')
  console.log('\n🔐 Comptes de démo:')
  console.log('1. Propriétaire: michelmanga941@gmail.com / demo123')
  console.log('2. Directeur: yves@school.cm / demo123')
  console.log('3. Secrétaire: marie@school.cm / demo123')
  console.log('4. Enseignant (Math): ines.math@school.cm / demo123')
  console.log('5. Enseignant (English): benjamin.english@school.cm / demo123')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
