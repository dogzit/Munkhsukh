-- CreateTable
CREATE TABLE "TeacherPost" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherPost_category_createdAt_idx" ON "TeacherPost"("category", "createdAt");

-- AddForeignKey
ALTER TABLE "TeacherPost" ADD CONSTRAINT "TeacherPost_userName_fkey" FOREIGN KEY ("userName") REFERENCES "User"("name") ON DELETE CASCADE ON UPDATE CASCADE;
