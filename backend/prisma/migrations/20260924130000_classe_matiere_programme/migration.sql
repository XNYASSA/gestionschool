-- CreateTable
CREATE TABLE "ClasseMatiere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classeId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClasseMatiere_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClasseMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClasseMatiere_classeId_matiereId_key" ON "ClasseMatiere"("classeId", "matiereId");
