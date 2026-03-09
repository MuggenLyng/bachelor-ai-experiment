-- CreateTable
CREATE TABLE "ParticipantLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "priorKnowledge" INTEGER,
    "confidence" INTEGER,
    "quizScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantLog_pkey" PRIMARY KEY ("id")
);
