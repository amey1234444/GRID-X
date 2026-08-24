-- Section 18: password recovery for internal users. Partners sign in with an OTP, so a forgotten
-- password costs them nothing; an internal user had only a password and no way back from losing it.
-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "requestedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Module 6: the material transaction ledger. The blueprint lists ten transaction types; four of
-- them had no home because movements were inferred from the issue, consumption, scrap and
-- reconciliation tables. Rejected material going back, replacement material coming out and excess
-- returned could not be recorded at all.
-- CreateTable
CREATE TABLE "MaterialTransaction" (
    "id" TEXT NOT NULL,
    "type" "MaterialTransactionType" NOT NULL,
    "jobId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "directionKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "partnerId" TEXT,
    "materialIssueId" TEXT,
    "batchNumber" TEXT,
    "heatNumber" TEXT,
    "replacesTransactionId" TEXT,
    "reference" TEXT,
    "remarks" TEXT,
    "recordedById" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialTransaction_jobId_itemId_idx" ON "MaterialTransaction"("jobId", "itemId");

-- CreateIndex
CREATE INDEX "MaterialTransaction_partnerId_type_idx" ON "MaterialTransaction"("partnerId", "type");

-- CreateIndex
CREATE INDEX "MaterialTransaction_occurredAt_idx" ON "MaterialTransaction"("occurredAt");

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GridJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_materialIssueId_fkey" FOREIGN KEY ("materialIssueId") REFERENCES "MaterialIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_replacesTransactionId_fkey" FOREIGN KEY ("replacesTransactionId") REFERENCES "MaterialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Module 8: how much of a lot must actually be measured. The sampling plan was free text nobody
-- could enforce, so an inspector could measure one piece of a 500-piece batch and the record still
-- looked complete.
-- AlterTable
ALTER TABLE "InspectionPlan" ADD COLUMN     "samplePercent" DOUBLE PRECISION,
ADD COLUMN     "minSampleSize" INTEGER;
