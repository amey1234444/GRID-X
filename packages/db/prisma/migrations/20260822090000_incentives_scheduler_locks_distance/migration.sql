-- Module 4: partner distance feeds the allocation ranking. It was typed in by hand while the
-- coordinates sat unused on the record, so it is now measured from the plant these columns place.
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- Module 11: the performance a partner must reach before an incentive rule pays out. Without it a
-- rule had no earning condition, which is part of why the incentive half of the payment formula
-- was never once evaluated.
-- AlterTable
ALTER TABLE "PartnerIncentiveRule" ADD COLUMN     "thresholdPercent" DOUBLE PRECISION;

-- Section 18 scalability: scheduled work claims a named lock so a second API instance does not
-- publish the same month's scorecards or alert the same partner twice.
-- CreateTable
CREATE TABLE "SchedulerLock" (
    "name" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerLock_pkey" PRIMARY KEY ("name")
);

-- Rate-limit counters shared across instances. Held in process memory the sign-in limit multiplied
-- by the instance count, so scaling out quietly widened the brute-force window.
-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "id" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerLock_lockedUntil_idx" ON "SchedulerLock"("lockedUntil");

-- CreateIndex
CREATE INDEX "RateLimitCounter_expiresAt_idx" ON "RateLimitCounter"("expiresAt");
