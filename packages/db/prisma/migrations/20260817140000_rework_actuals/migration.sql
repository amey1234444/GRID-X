-- Rework orders record what was actually reworked, scrapped and spent, so rework
-- cost recovery can be reconciled against the estimate raised at inspection.
ALTER TABLE "ReworkOrder"
  ADD COLUMN "completedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "scrappedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
