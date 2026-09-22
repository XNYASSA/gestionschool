-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Eleve" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "sexe" TEXT,
    "dateNaissance" DATETIME,
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
INSERT INTO "new_Eleve" ("adresseParent", "classeId", "createdAt", "dateNaissance", "emailParent", "id", "lieuParente", "matricule", "nom", "nomParent", "prenom", "sexe", "telephoneParent", "updatedAt") SELECT "adresseParent", "classeId", "createdAt", "dateNaissance", "emailParent", "id", "lieuParente", "matricule", "nom", "nomParent", "prenom", "sexe", "telephoneParent", "updatedAt" FROM "Eleve";
DROP TABLE "Eleve";
ALTER TABLE "new_Eleve" RENAME TO "Eleve";
CREATE UNIQUE INDEX "Eleve_matricule_key" ON "Eleve"("matricule");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
