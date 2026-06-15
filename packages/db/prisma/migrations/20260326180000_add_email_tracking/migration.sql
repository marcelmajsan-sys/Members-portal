-- Add tracking fields to EmailLog
ALTER TABLE "EmailLog" ADD COLUMN "trackingId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN "openedAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN "clickedAt" TIMESTAMP(3);

-- Backfill trackingId for existing rows
UPDATE "EmailLog" SET "trackingId" = id WHERE "trackingId" IS NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "EmailLog_trackingId_key" ON "EmailLog"("trackingId");
