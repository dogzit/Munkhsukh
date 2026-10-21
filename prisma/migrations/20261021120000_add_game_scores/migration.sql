-- CreateTable
CREATE TABLE "GameScore" (
    "id" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "best" INTEGER NOT NULL,
    "bestTile" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameScore_game_userName_key" ON "GameScore"("game", "userName");

-- CreateIndex
CREATE INDEX "GameScore_game_best_idx" ON "GameScore"("game", "best");
