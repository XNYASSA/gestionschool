-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fonction" TEXT,
    "telephone" TEXT,
    "salaireMensuel" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UtilisateurEcole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UtilisateurEcole_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UtilisateurEcole_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ecole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nomCourt" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "adresse" TEXT NOT NULL DEFAULT 'Yaoundé, Cameroun',
    "telephone" TEXT NOT NULL DEFAULT '+237 6 XX XXX XXXX',
    "email" TEXT NOT NULL DEFAULT 'info@school.cm',
    "anneeScolaireEnCours" TEXT NOT NULL DEFAULT '2024-2025',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Classe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Classe_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Eleve" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "dateNaissance" DATETIME NOT NULL,
    "classeId" TEXT NOT NULL,
    "nomParent" TEXT NOT NULL,
    "lieuParente" TEXT,
    "telephoneParent" TEXT NOT NULL,
    "emailParent" TEXT,
    "adresseParent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Eleve_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InscriptionFrais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "tranche" TEXT NOT NULL,
    "montantDu" INTEGER NOT NULL,
    "montantPaye" INTEGER NOT NULL DEFAULT 0,
    "modePayement" TEXT,
    "datePayement" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'IMPAYE',
    "statutValidation" TEXT NOT NULL DEFAULT 'BROUILLON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InscriptionFrais_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "inscriptionFraisId" TEXT,
    "tranche" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "modePayement" TEXT,
    "effectueParId" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paiement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Paiement_inscriptionFraisId_fkey" FOREIGN KEY ("inscriptionFraisId") REFERENCES "InscriptionFrais" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Paiement_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enseignant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "dateEmbauche" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tarifHoraire" INTEGER,
    CONSTRAINT "Enseignant_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Matiere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Matiere_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnseignantClasseMatiere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enseignantId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "nombreLeconsPrevues" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnseignantClasseMatiere_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnseignantClasseMatiere_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnseignantClasseMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lecon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ecmId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lecon_ecmId_fkey" FOREIGN KEY ("ecmId") REFERENCES "EnseignantClasseMatiere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "ecmId" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "valeur" REAL NOT NULL,
    "observation" TEXT,
    "statutValidation" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateValidation" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_ecmId_fkey" FOREIGN KEY ("ecmId") REFERENCES "EnseignantClasseMatiere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ABSENT',
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Presence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Presence_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ecoleId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fonction" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "salaireMensuel" INTEGER NOT NULL,
    "dateEmbauche" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Personnel_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VARIABLE',
    "montant" INTEGER NOT NULL,
    "dateDepense" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ecoleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Depense_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "dateTransaction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConfigurationFrais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ecoleId" TEXT NOT NULL,
    "montantInscription" INTEGER NOT NULL DEFAULT 50000,
    "montantFraisTotal" INTEGER NOT NULL DEFAULT 80000,
    "dateLimiteInscription" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConfigurationFrais_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tranche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configurationFraisId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL,
    "dateLimite" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tranche_configurationFraisId_fkey" FOREIGN KEY ("configurationFraisId") REFERENCES "ConfigurationFrais" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaisieQuotidienne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "donnees" TEXT NOT NULL,
    "validee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaisieQuotidienne_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaisieQuotidienne_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnomalieDetetee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "eleveId" TEXT,
    "montant" INTEGER,
    "source1" TEXT NOT NULL,
    "source2" TEXT NOT NULL,
    "source3" TEXT,
    "valeur1" TEXT NOT NULL,
    "valeur2" TEXT NOT NULL,
    "valeur3" TEXT,
    "ecartsDetectes" TEXT NOT NULL,
    "resolue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnomalieDetetee_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnomalieDetetee_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HoraireTravail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "jour" TEXT NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HoraireTravail_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HoraireTravail_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PresencePersonnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PRESENT',
    "heureArrivee" TEXT,
    "heureDepart" TEXT,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PresencePersonnel_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PresencePersonnel_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Annonce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "creeeParId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Annonce_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Annonce_creeeParId_fkey" FOREIGN KEY ("creeeParId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bulletin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "urlPdf" TEXT,
    "dateGeneration" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bulletin_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parametres" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ecoleId" TEXT NOT NULL,
    "baremeNotation" TEXT NOT NULL,
    "echances" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Parametres_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UtilisateurEcole_utilisateurId_ecoleId_key" ON "UtilisateurEcole"("utilisateurId", "ecoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Ecole_nomCourt_key" ON "Ecole"("nomCourt");

-- CreateIndex
CREATE UNIQUE INDEX "Eleve_matricule_key" ON "Eleve"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Enseignant_utilisateurId_key" ON "Enseignant"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_eleveId_date_key" ON "Presence"("eleveId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationFrais_ecoleId_key" ON "ConfigurationFrais"("ecoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Tranche_configurationFraisId_numero_key" ON "Tranche"("configurationFraisId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "HoraireTravail_utilisateurId_jour_key" ON "HoraireTravail"("utilisateurId", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "PresencePersonnel_utilisateurId_date_key" ON "PresencePersonnel"("utilisateurId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Bulletin_eleveId_trimestre_anneeScolaire_key" ON "Bulletin"("eleveId", "trimestre", "anneeScolaire");

-- CreateIndex
CREATE UNIQUE INDEX "Parametres_ecoleId_key" ON "Parametres"("ecoleId");

