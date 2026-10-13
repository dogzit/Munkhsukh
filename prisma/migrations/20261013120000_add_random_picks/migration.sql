-- CreateTable
CREATE TABLE "RandomPick" (
    "id" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "pool" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RandomPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RandomPick_createdAt_idx" ON "RandomPick"("createdAt");
