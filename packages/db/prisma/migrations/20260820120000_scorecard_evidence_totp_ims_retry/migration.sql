-- Section 18: real RFC 6238 two-factor authentication. The secret is only trusted once the user
-- has proved they can read a code from it (twoFactorConfirmedAt), and recovery codes — Argon2
-- hashes, single use — mean a lost device is not a lost account.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Module 12: every KPI falls back to 100 when there is nothing to measure, so a partner with no
-- completed work would otherwise read as a category A performer. Recording whether the period
-- carried enough work keeps the score from being mistaken for a verdict.
-- AlterTable
ALTER TABLE "PartnerScore" ADD COLUMN     "hasSufficientData" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "insufficientDataReason" TEXT;

-- Section 10: an outbound fact IMS has not accepted is a delivery still owed, not a dropped log
-- line. These columns drive the retry worker's backoff and its give-up point.
-- AlterTable
ALTER TABLE "ImsSyncLog" ADD COLUMN     "abandonedAt" TIMESTAMP(3),
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- The retry sweep selects on exactly this predicate every ten minutes.
-- CreateIndex
CREATE INDEX "ImsSyncLog_direction_success_nextAttemptAt_idx" ON "ImsSyncLog"("direction", "success", "nextAttemptAt");
