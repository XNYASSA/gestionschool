-- CreateTable
CREATE TABLE "VerificationPaiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "effectueParId" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationPaiement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationPaiement_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

