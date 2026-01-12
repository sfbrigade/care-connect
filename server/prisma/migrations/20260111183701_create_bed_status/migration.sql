/*
  Warnings:

  - The primary key for the `FacilityService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `availableBeds` on the `FacilityService` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `FacilityService` table. All the data in the column will be lost.
  - You are about to drop the column `reservedBeds` on the `FacilityService` table. All the data in the column will be lost.
  - You are about to drop the column `serviceTypeId` on the `FacilityService` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `FacilityService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `FacilityService` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BedType" AS ENUM ('BED', 'CHAIR');

-- DropForeignKey
ALTER TABLE "public"."FacilityCapacitySnapshot" DROP CONSTRAINT "FacilityCapacitySnapshot_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FacilityService" DROP CONSTRAINT "FacilityService_serviceTypeId_fkey";

-- AlterTable
ALTER TABLE "public"."FacilityService" RENAME TO "BedStatus";

ALTER TABLE "public"."BedStatus" RENAME COLUMN "availableBeds" TO "capacity";
ALTER TABLE "public"."BedStatus" RENAME COLUMN "reservedBeds" TO "unavailableUnoccupied";
ALTER TABLE "public"."BedStatus" RENAME CONSTRAINT "FacilityService_facilityId_fkey" TO "BedStatus_facilityId_fkey";

ALTER TABLE "public"."BedStatus"
DROP CONSTRAINT "FacilityService_pkey",
DROP COLUMN "serviceTypeId",
DROP COLUMN "description",
ADD COLUMN     "unavailableOccupied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "occupied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "available" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "holds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "type" "public"."BedType" NOT NULL DEFAULT 'BED',
ADD COLUMN     "createdById" UUID,
ADD COLUMN     "updatedById" UUID,
ADD COLUMN     "updateMethod" "public"."FacilityUpdateMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "updateNotes" TEXT,
ADD CONSTRAINT "BedStatus_pkey" PRIMARY KEY ("id");

UPDATE "public"."BedStatus" SET "available" = "capacity" - "unavailableUnoccupied" - "unavailableOccupied" - "holds";
UPDATE "public"."BedStatus" SET "createdById" = (SELECT "id" FROM "public"."User" WHERE "isAdmin" = true LIMIT 1);
UPDATE "public"."BedStatus" SET "updatedById" = (SELECT "id" FROM "public"."User" WHERE "isAdmin" = true LIMIT 1);

ALTER TABLE "public"."BedStatus" 
ALTER COLUMN "createdById" SET NOT NULL,
ALTER COLUMN "updatedById" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."FacilityCapacitySnapshot" RENAME TO "BedStatusUpdate";
ALTER TABLE "public"."BedStatusUpdate" RENAME CONSTRAINT "FacilityCapacitySnapshot_pkey" TO "BedStatusUpdate_pkey";
ALTER TABLE "public"."BedStatusUpdate" RENAME COLUMN "totalBeds" TO "capacity";
ALTER TABLE "public"."BedStatusUpdate" RENAME COLUMN "availableBeds" TO "available";
ALTER TABLE "public"."BedStatusUpdate" RENAME COLUMN "reservedBeds" TO "unavailableUnoccupied";
ALTER TABLE "public"."BedStatusUpdate" RENAME COLUMN "createdAt" TO "updatedAt";
ALTER TABLE "public"."BedStatusUpdate" RENAME COLUMN "lastSyncSource" TO "updateNotes";

UPDATE "public"."BedStatusUpdate" SET "capacity" = 0 WHERE "capacity" IS NULL;
UPDATE "public"."BedStatusUpdate" SET "available" = 0 WHERE "available" IS NULL;
UPDATE "public"."BedStatusUpdate" SET "unavailableUnoccupied" = 0 WHERE "unavailableUnoccupied" IS NULL;

ALTER TABLE "public"."BedStatusUpdate"
DROP COLUMN "observedAt",
ALTER COLUMN "capacity" SET DEFAULT 0,
ALTER COLUMN "capacity" SET NOT NULL,
ALTER COLUMN "available" SET DEFAULT 0,
ALTER COLUMN "available" SET NOT NULL,
ALTER COLUMN "unavailableUnoccupied" SET DEFAULT 0,
ALTER COLUMN "unavailableUnoccupied" SET NOT NULL,
ADD COLUMN     "unavailableOccupied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "occupied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "holds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bedStatusId" UUID,
ADD COLUMN     "updateMethod" "public"."FacilityUpdateMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "updatedById" UUID;

UPDATE "public"."BedStatusUpdate" SET "available" = "capacity" - "unavailableUnoccupied" - "unavailableOccupied" - "holds";
UPDATE "public"."BedStatusUpdate" SET "updatedById" = (SELECT "id" FROM "public"."User" WHERE "isAdmin" = true LIMIT 1);
UPDATE "public"."BedStatusUpdate" SET "bedStatusId" = (SELECT "id" FROM "public"."BedStatus" WHERE "facilityId" = "facilityId" LIMIT 1);

ALTER TABLE "public"."BedStatusUpdate" 
DROP COLUMN "facilityId",
ALTER COLUMN "bedStatusId" SET NOT NULL,
ALTER COLUMN "updatedById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."BedStatus" ADD CONSTRAINT "BedStatus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedStatus" ADD CONSTRAINT "BedStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedStatusUpdate" ADD CONSTRAINT "BedStatusUpdate_bedStatusId_fkey" FOREIGN KEY ("bedStatusId") REFERENCES "public"."BedStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedStatusUpdate" ADD CONSTRAINT "BedStatusUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
