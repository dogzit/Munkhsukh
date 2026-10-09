-- AlterTable
ALTER TABLE "User" ADD COLUMN "branch" INTEGER;

-- CreateTable
CREATE TABLE "BranchPost" (
    "id" TEXT NOT NULL,
    "branch" INTEGER NOT NULL,
    "userName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BranchPost_branch_createdAt_idx" ON "BranchPost"("branch", "createdAt");

-- AddForeignKey
ALTER TABLE "BranchPost" ADD CONSTRAINT "BranchPost_userName_fkey" FOREIGN KEY ("userName") REFERENCES "User"("name") ON DELETE CASCADE ON UPDATE CASCADE;
