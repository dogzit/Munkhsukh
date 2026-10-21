-- CreateTable
CREATE TABLE "CleaningRoster" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "groups" JSONB NOT NULL DEFAULT '[]',
    "anchorDate" TEXT NOT NULL,
    "anchorIndex" INTEGER NOT NULL DEFAULT 0,
    "skipWeekends" BOOLEAN NOT NULL DEFAULT true,
    "lastNotified" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningRoster_pkey" PRIMARY KEY ("id")
);
