-- AlterTable
ALTER TABLE "Ecole" ADD COLUMN "delegationDepartementale" TEXT;
ALTER TABLE "Ecole" ADD COLUMN "delegationRegionale" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bulletin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "urlPdf" TEXT,
    "dateGeneration" DATETIME,
    "exclusionDefinitive" BOOLEAN NOT NULL DEFAULT false,
    "joursExclusion" INTEGER,
    "absenteisme" BOOLEAN NOT NULL DEFAULT false,
    "conduiteDeplorable" BOOLEAN NOT NULL DEFAULT false,
    "convocation" BOOLEAN NOT NULL DEFAULT false,
    "tableauHonneur" BOOLEAN NOT NULL DEFAULT false,
    "encouragement" BOOLEAN NOT NULL DEFAULT false,
    "felicitations" BOOLEAN NOT NULL DEFAULT false,
    "avertissementTravail" BOOLEAN NOT NULL DEFAULT false,
    "blameTravail" BOOLEAN NOT NULL DEFAULT false,
    "avertissementConduite" BOOLEAN NOT NULL DEFAULT false,
    "blameConduite" BOOLEAN NOT NULL DEFAULT false,
    "observationConseil" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bulletin_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bulletin" ("anneeScolaire", "createdAt", "dateGeneration", "eleveId", "id", "trimestre", "updatedAt", "urlPdf") SELECT "anneeScolaire", "createdAt", "dateGeneration", "eleveId", "id", "trimestre", "updatedAt", "urlPdf" FROM "Bulletin";
DROP TABLE "Bulletin";
ALTER TABLE "new_Bulletin" RENAME TO "Bulletin";
CREATE UNIQUE INDEX "Bulletin_eleveId_trimestre_anneeScolaire_key" ON "Bulletin"("eleveId", "trimestre", "anneeScolaire");
CREATE TABLE "new_Classe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "professeurPrincipalId" TEXT,
    CONSTRAINT "Classe_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Classe_professeurPrincipalId_fkey" FOREIGN KEY ("professeurPrincipalId") REFERENCES "Enseignant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Classe" ("createdAt", "ecoleId", "id", "niveau", "nom", "updatedAt") SELECT "createdAt", "ecoleId", "id", "niveau", "nom", "updatedAt" FROM "Classe";
DROP TABLE "Classe";
ALTER TABLE "new_Classe" RENAME TO "Classe";
CREATE INDEX "Classe_ecoleId_idx" ON "Classe"("ecoleId");
CREATE TABLE "new_Eleve" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "sexe" TEXT,
    "dateNaissance" DATETIME,
    "lieuNaissance" TEXT,
    "classeId" TEXT NOT NULL,
    "filiere" TEXT,
    "redouble" BOOLEAN NOT NULL DEFAULT false,
    "nomParent" TEXT NOT NULL,
    "lieuParente" TEXT,
    "telephoneParent" TEXT NOT NULL,
    "emailParent" TEXT,
    "adresseParent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Eleve_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Eleve" ("adresseParent", "classeId", "createdAt", "dateNaissance", "emailParent", "filiere", "id", "lieuParente", "matricule", "nom", "nomParent", "prenom", "sexe", "telephoneParent", "updatedAt") SELECT "adresseParent", "classeId", "createdAt", "dateNaissance", "emailParent", "filiere", "id", "lieuParente", "matricule", "nom", "nomParent", "prenom", "sexe", "telephoneParent", "updatedAt" FROM "Eleve";
DROP TABLE "Eleve";
ALTER TABLE "new_Eleve" RENAME TO "Eleve";
CREATE UNIQUE INDEX "Eleve_matricule_key" ON "Eleve"("matricule");
CREATE INDEX "Eleve_classeId_idx" ON "Eleve"("classeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

