-- AlterTable
ALTER TABLE "ParticipantLog" ADD COLUMN     "followUpCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpFreeText" TEXT,
ADD COLUMN     "followUpFreeTextWordCount" INTEGER;
