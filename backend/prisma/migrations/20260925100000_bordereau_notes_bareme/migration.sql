-- CreateTable
CREATE TABLE "NoteEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "evaluation" INTEGER NOT NULL,
    "valeur" REAL NOT NULL,
    "saisiePar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoteEvaluation_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteEvaluation_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BaremeNotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ecoleId" TEXT NOT NULL,
    "valMin" REAL NOT NULL,
    "valMax" REAL NOT NULL,
    "apc" TEXT NOT NULL DEFAULT '',
    "gpa" REAL NOT NULL DEFAULT 0,
    "mentionFr" TEXT NOT NULL DEFAULT '',
    "mentionEn" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaremeNotation_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NoteEvaluation_matiereId_anneeScolaire_trimestre_evaluation_idx" ON "NoteEvaluation"("matiereId", "anneeScolaire", "trimestre", "evaluation");

-- CreateIndex
CREATE UNIQUE INDEX "NoteEvaluation_eleveId_matiereId_anneeScolaire_trimestre_evaluation_key" ON "NoteEvaluation"("eleveId", "matiereId", "anneeScolaire", "trimestre", "evaluation");

-- CreateIndex
CREATE INDEX "BaremeNotation_ecoleId_idx" ON "BaremeNotation"("ecoleId");

