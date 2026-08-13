-- CreateEnum
CREATE TYPE "CoachStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "CoachStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Coach_status_idx" ON "Coach"("status");
