-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveRequest_status_createdAt_idx" ON "LeaveRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_userName_createdAt_idx" ON "LeaveRequest"("userName", "createdAt");

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userName_fkey" FOREIGN KEY ("userName") REFERENCES "User"("name") ON DELETE CASCADE ON UPDATE CASCADE;
