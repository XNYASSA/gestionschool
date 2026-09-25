-- AlterTable
ALTER TABLE "NoteEvaluation" ADD COLUMN "statutValidation" TEXT NOT NULL DEFAULT 'BROUILLON';
ALTER TABLE "NoteEvaluation" ADD COLUMN "dateValidation" DATETIME;
ALTER TABLE "NoteEvaluation" ADD COLUMN "validePar" TEXT;
