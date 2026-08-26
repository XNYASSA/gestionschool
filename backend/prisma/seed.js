import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed: Restructuration multi-écoles...')

  // Créer les 6 écoles
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

  console.log('✓ 6 Écoles créées')

  // Créer les utilisateurs
  const hashedPassword = await bcryptjs.hash('password123', 10)

  const superAdmin = await prisma.utilisateur.create({
    data: {
      nom: 'Xavier Nyassa',
      email: 'admin@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'SUPER_ADMIN',
      actif: true
    }
  })

  const principal1 = await prisma.utilisateur.create({
    data: {
      nom: 'Dr. Jean Dupont',
      email: 'principal1@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'PRINCIPAL',
      actif: true
    }
  })

  const principal2 = await prisma.utilisateur.create({
    data: {
      nom: 'Dr. Marie Durand',
      email: 'principal2@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'PRINCIPAL',
      actif: true
    }
  })

  const directrice1 = await prisma.utilisateur.create({
    data: {
      nom: 'Mme Amélie Bernard',
      email: 'directrice1@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'DIRECTRICE',
      actif: true
    }
  })

  const directrice2 = await prisma.utilisateur.create({
    data: {
      nom: 'Mme Sophie Lebrun',
      email: 'directrice2@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'DIRECTRICE',
      actif: true
    }
  })

  const secretaire = await prisma.utilisateur.create({
    data: {
      nom: 'Alice Martin',
      email: 'secretaire@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'SECRETAIRE',
      actif: true
    }
  })

  const enseignant = await prisma.utilisateur.create({
    data: {
      nom: 'Prof. Michel Leclerc',
      email: 'enseignant@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'ENSEIGNANT',
      actif: true
    }
  })

  const economat = await prisma.utilisateur.create({
    data: {
      nom: 'Pierre Economiste',
      email: 'economat@gestionschool.cm',
      motDePasse: hashedPassword,
      role: 'ECONOMAT',
      actif: true
    }
  })

  console.log('✓ 8 Utilisateurs créés')

  // Attribuer les permissions par école
  await Promise.all([
    // Super Admin accès à toutes les écoles
    ...ecoles.map(ecole =>
      prisma.utilisateurEcole.create({
        data: {
          utilisateurId: superAdmin.id,
          ecoleId: ecole.id,
          role: 'SUPER_ADMIN'
        }
      })
    ),
    // Principal 1 → CRP Francophone + CBM
    prisma.utilisateurEcole.create({
      data: { utilisateurId: principal1.id, ecoleId: ecoles[0].id, role: 'PRINCIPAL' }
    }),
    prisma.utilisateurEcole.create({
      data: { utilisateurId: principal1.id, ecoleId: ecoles[3].id, role: 'PRINCIPAL' }
    }),
    // Principal 2 → CRP Anglophone + CRP Technique
    prisma.utilisateurEcole.create({
      data: { utilisateurId: principal2.id, ecoleId: ecoles[1].id, role: 'PRINCIPAL' }
    }),
    prisma.utilisateurEcole.create({
      data: { utilisateurId: principal2.id, ecoleId: ecoles[2].id, role: 'PRINCIPAL' }
    }),
    // Directrice 1 → EBSB
    prisma.utilisateurEcole.create({
      data: { utilisateurId: directrice1.id, ecoleId: ecoles[4].id, role: 'DIRECTRICE' }
    }),
    // Directrice 2 → EBRP
    prisma.utilisateurEcole.create({
      data: { utilisateurId: directrice2.id, ecoleId: ecoles[5].id, role: 'DIRECTRICE' }
    }),
    // Secrétaire accès à toutes les écoles
    ...ecoles.map(ecole =>
      prisma.utilisateurEcole.create({
        data: {
          utilisateurId: secretaire.id,
          ecoleId: ecole.id,
          role: 'SECRETAIRE'
        }
      })
    ),
    // Enseignant accès à tous les écoles
    ...ecoles.map(ecole =>
      prisma.utilisateurEcole.create({
        data: {
          utilisateurId: enseignant.id,
          ecoleId: ecole.id,
          role: 'ENSEIGNANT'
        }
      })
    ),
    // Économat accès à toutes les écoles
    ...ecoles.map(ecole =>
      prisma.utilisateurEcole.create({
        data: {
          utilisateurId: economat.id,
          ecoleId: ecole.id,
          role: 'ECONOMAT'
        }
      })
    )
  ])

  console.log('✓ Permissions attribuées par école')

  // Créer les classes pour chaque école selon la spécification camerounaise
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
        data: {
          nom: classeConfig.nom,
          niveau: classeConfig.niveau,
          ecoleId: ecole.id
        }
      })
      classesMap[ecole.nomCourt].push(classe)
    }
  }

  console.log('✓ Classes créées pour chaque école selon la spécification camerounaise')

  // Créer les matières par école
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
      await prisma.matiere.create({
        data: {
          nom: nomMatiere,
          ecoleId: ecole.id,
          coefficient: 3
        }
      })
    }
  }

  console.log('✓ Matières créées pour chaque école')

  // Créer les configurations de frais par école
  for (const ecole of ecoles) {
    await prisma.configurationFrais.create({
      data: {
        ecoleId: ecole.id,
        montantInscription: 50000,
        montantFraisTotal: 800000,
        tranches: {
          create: [
            { numero: 1, montant: 300000 },
            { numero: 2, montant: 250000 },
            { numero: 3, montant: 250000 }
          ]
        }
      }
    })
  }

  console.log('✓ Configurations de frais créées')

  // Créer les personnels pour chaque école
  for (const ecole of ecoles) {
    const personnels = [
      { nom: 'Directeur', fonction: 'Directeur', salaire: 750000 },
      { nom: 'Censeur', fonction: 'Censeur', salaire: 450000 },
      { nom: 'Surveillant', fonction: 'Surveillant Général', salaire: 300000 },
      { nom: 'Intendant', fonction: 'Intendant', salaire: 250000 },
      { nom: 'Secrétaire Général', fonction: 'Secrétaire Général', salaire: 200000 }
    ]

    for (const p of personnels) {
      await prisma.personnel.create({
        data: {
          nom: `${p.nom} - ${ecole.nomCourt}`,
          fonction: p.fonction,
          telephone: '+237 6 XX XXX XXXX',
          salaireMensuel: p.salaire,
          ecoleId: ecole.id
        }
      })
    }
  }

  console.log('✓ Personnels créés pour chaque école')

  // Créer les enseignants
  const nomsPrenoms = [
    { nom: 'Dupont', prenom: 'Jean' },
    { nom: 'Martin', prenom: 'Marie' },
    { nom: 'Bernard', prenom: 'Pierre' },
    { nom: 'Thomas', prenom: 'Sophie' },
    { nom: 'Robert', prenom: 'Marc' }
  ]

  for (const nomPrenom of nomsPrenoms) {
    const user = await prisma.utilisateur.create({
      data: {
        nom: `${nomPrenom.prenom} ${nomPrenom.nom}`,
        email: `prof.${nomPrenom.prenom.toLowerCase()}@school.cm`,
        motDePasse: hashedPassword,
        role: 'ENSEIGNANT'
      }
    })

    const enseignant = await prisma.enseignant.create({
      data: {
        utilisateurId: user.id,
        telephone: '+237 6 XX XXX XXXX'
      }
    })

    // Assigner l'enseignant à 2 écoles
    const ecole1 = ecoles[Math.floor(Math.random() * 6)]
    const ecole2 = ecoles[Math.floor(Math.random() * 6)]

    await prisma.utilisateurEcole.create({
      data: { utilisateurId: user.id, ecoleId: ecole1.id, role: 'ENSEIGNANT' }
    })
    if (ecole1.id !== ecole2.id) {
      await prisma.utilisateurEcole.create({
        data: { utilisateurId: user.id, ecoleId: ecole2.id, role: 'ENSEIGNANT' }
      })
    }

    // Assigner à quelques classes
    const classesEcole1 = classesMap[ecole1.nomCourt]
    if (classesEcole1.length > 0) {
      const classe = classesEcole1[0]
      const matiere = (await prisma.matiere.findMany({ where: { ecoleId: ecole1.id }, take: 1 }))[0]
      if (matiere) {
        await prisma.enseignantClasseMatiere.create({
          data: {
            enseignantId: enseignant.id,
            classeId: classe.id,
            matiereId: matiere.id
          }
        })
      }
    }
  }

  console.log('✓ Enseignants créés')

  // Créer 50 élèves et les frais
  const noms = ['Nkomo', 'Kamdem', 'Fokou', 'Mbala', 'Tsomé', 'Mouafo', 'Eyambe', 'Tchaptchet', 'Njamen', 'Ouakoume', 'Engono', 'Talla', 'Diouf', 'Keita', 'Sow', 'Kone', 'Coulibaly', 'Ba', 'Diop', 'Faye']
  const prenoms = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Marc', 'Anne', 'Paul', 'Léa', 'Michel', 'Carole', 'Alain', 'Brigitte', 'Claude', 'Danielle', 'Émile', 'Françoise', 'Gérard', 'Hélène', 'Irène', 'Jacques']

  for (let i = 0; i < 50; i++) {
    const ecole = ecoles[i % 6]
    const classesEcole = classesMap[ecole.nomCourt]
    const classe = classesEcole[i % classesEcole.length]

    const eleve = await prisma.eleve.create({
      data: {
        matricule: `MAT${String(i + 1).padStart(3, '0')}`,
        nom: noms[i % noms.length],
        prenom: prenoms[i % prenoms.length],
        sexe: i % 2 === 0 ? 'MASCULIN' : 'FEMININ',
        dateNaissance: new Date(2010 + Math.floor(i / 15), Math.random() * 12, Math.floor(Math.random() * 28) + 1),
        classeId: classe.id,
        nomParent: `Parent de ${prenoms[i % prenoms.length]} ${noms[i % noms.length]}`,
        lieuParente: ['Mère', 'Père', 'Tuteur'][Math.floor(Math.random() * 3)],
        telephoneParent: '+237 6 ' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'),
        emailParent: `parent${i}@email.cm`,
        adresseParent: 'Yaoundé, Cameroun'
      }
    })

    // Créer les frais de cet élève
    const statuts = ['SOLDE', 'PARTIEL', 'IMPAYE']
    const statut = statuts[Math.floor(Math.random() * 3)]

    const montantInscription = 50000
    const montantTranche = 250000

    await prisma.inscriptionFrais.create({
      data: {
        eleveId: eleve.id,
        tranche: 'inscription',
        montantDu: montantInscription,
        montantPaye: statut === 'SOLDE' ? montantInscription : statut === 'PARTIEL' ? Math.floor(montantInscription / 2) : 0,
        modePayement: ['ORANGE_MONEY', 'MTN_MOMO', 'ESPECES'][Math.floor(Math.random() * 3)],
        statut: statut === 'SOLDE' ? 'SOLDE' : statut === 'PARTIEL' ? 'PARTIEL' : 'IMPAYE',
        statutValidation: 'VALIDE'
      }
    })

    // Tranches
    for (let t = 1; t <= 3; t++) {
      const statutTranche = statuts[Math.floor(Math.random() * 3)]
      await prisma.inscriptionFrais.create({
        data: {
          eleveId: eleve.id,
          tranche: `tranche${t}`,
          montantDu: montantTranche,
          montantPaye: statutTranche === 'SOLDE' ? montantTranche : statutTranche === 'PARTIEL' ? Math.floor(montantTranche / 2) : 0,
          modePayement: ['ORANGE_MONEY', 'MTN_MOMO', 'ESPECES'][Math.floor(Math.random() * 3)],
          statut: statutTranche === 'SOLDE' ? 'SOLDE' : statutTranche === 'PARTIEL' ? 'PARTIEL' : 'IMPAYE',
          statutValidation: 'VALIDE'
        }
      })
    }
  }

  console.log('✓ 50 Élèves créés avec frais')

  console.log('✅ Seed réussi ! Base de données restructurée pour multi-écoles')
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
