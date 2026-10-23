-- CreateTable
CREATE TABLE "XoGame" (
    "id" TEXT NOT NULL,
    "challenger" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "board" TEXT NOT NULL DEFAULT '.........',
    "turn" TEXT,
    "winner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XoGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XoGame_challenger_status_idx" ON "XoGame"("challenger", "status");

-- CreateIndex
CREATE INDEX "XoGame_opponent_status_idx" ON "XoGame"("opponent", "status");
