/*
  Warnings:

  - The primary key for the `ParticipantLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `quizScore` on the `ParticipantLog` table. All the data in the column will be lost.
  - The `id` column on the `ParticipantLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[participantId]` on the table `ParticipantLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[followUpToken]` on the table `ParticipantLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ParticipantLog" DROP CONSTRAINT "ParticipantLog_pkey",
DROP COLUMN "quizScore",
ADD COLUMN     "assistantMessageCount" INTEGER,
ADD COLUMN     "chatMessageCount" INTEGER,
ADD COLUMN     "chatTranscript" TEXT,
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dropoutStep" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "engagement1" INTEGER,
ADD COLUMN     "engagement2" INTEGER,
ADD COLUMN     "engagement3" INTEGER,
ADD COLUMN     "followUpToken" TEXT,
ADD COLUMN     "freeTextResponse" TEXT,
ADD COLUMN     "freeTextWordCount" INTEGER,
ADD COLUMN     "perceivedLearning1" INTEGER,
ADD COLUMN     "perceivedLearning2" INTEGER,
ADD COLUMN     "perceivedLearning3" INTEGER,
ADD COLUMN     "pretestQ1" INTEGER,
ADD COLUMN     "pretestQ2" INTEGER,
ADD COLUMN     "pretestQ3" INTEGER,
ADD COLUMN     "pretestQ4" INTEGER,
ADD COLUMN     "pretestScore" INTEGER,
ADD COLUMN     "trust1" INTEGER,
ADD COLUMN     "trust2" INTEGER,
ADD COLUMN     "trust3" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "userMessageCount" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "ParticipantLog_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantLog_participantId_key" ON "ParticipantLog"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantLog_followUpToken_key" ON "ParticipantLog"("followUpToken");
