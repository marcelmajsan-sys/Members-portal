-- AlterTable: Add certificate tracking fields to Member
ALTER TABLE "Member" ADD COLUMN "hasCertificate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN "hasAcademy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN "safeShopStatus" TEXT;
