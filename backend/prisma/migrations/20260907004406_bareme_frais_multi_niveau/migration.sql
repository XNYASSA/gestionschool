-- DropIndex
DROP INDEX "ConfigurationFrais_ecoleId_key";

-- AlterTable
ALTER TABLE "ConfigurationFrais" ADD COLUMN "libelle" TEXT;

-- AlterTable
ALTER TABLE "InscriptionFrais" ADD COLUMN "libelle" TEXT;

-- CreateTable
CREATE TABLE "ConfigurationFraisNiveau" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configurationFraisId" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    CONSTRAINT "ConfigurationFraisNiveau_configurationFraisId_fkey" FOREIGN KEY ("configurationFraisId") REFERENCES "ConfigurationFrais" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraisAnnexe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configurationFraisId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "dateLimite" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraisAnnexe_configurationFraisId_fkey" FOREIGN KEY ("configurationFraisId") REFERENCES "ConfigurationFrais" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationFraisNiveau_ecoleId_niveau_key" ON "ConfigurationFraisNiveau"("ecoleId", "niveau");

-- CreateIndex
CREATE UNIQUE INDEX "FraisAnnexe_configurationFraisId_nom_key" ON "FraisAnnexe"("configurationFraisId", "nom");

