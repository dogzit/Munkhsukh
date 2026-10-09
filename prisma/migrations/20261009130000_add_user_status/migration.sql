-- AlterTable
-- Одоо байгаа хэрэглэгчид APPROVED болно
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
