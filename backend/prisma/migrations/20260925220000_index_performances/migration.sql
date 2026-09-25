-- CreateIndex
CREATE INDEX "Classe_ecoleId_idx" ON "Classe"("ecoleId");

-- CreateIndex
CREATE INDEX "Eleve_classeId_idx" ON "Eleve"("classeId");

-- CreateIndex
CREATE INDEX "EnseignantClasseMatiere_classeId_idx" ON "EnseignantClasseMatiere"("classeId");

-- CreateIndex
CREATE INDEX "InscriptionFrais_eleveId_idx" ON "InscriptionFrais"("eleveId");

-- CreateIndex
CREATE INDEX "Matiere_ecoleId_idx" ON "Matiere"("ecoleId");

-- CreateIndex
CREATE INDEX "Note_eleveId_idx" ON "Note"("eleveId");

-- CreateIndex
CREATE INDEX "Note_ecmId_idx" ON "Note"("ecmId");

-- CreateIndex
CREATE INDEX "Paiement_eleveId_idx" ON "Paiement"("eleveId");

-- CreateIndex
CREATE INDEX "Paiement_inscriptionFraisId_idx" ON "Paiement"("inscriptionFraisId");

