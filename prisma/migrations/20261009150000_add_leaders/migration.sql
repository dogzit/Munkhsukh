-- AlterTable
ALTER TABLE "User" ADD COLUMN "branchLeader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BranchPost" ADD COLUMN "checkedBy" TEXT,
ADD COLUMN "checkedAt" TIMESTAMP(3);
