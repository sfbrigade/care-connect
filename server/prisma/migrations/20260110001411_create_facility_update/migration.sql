/*
  Warnings:

  - You are about to drop the `PlacementRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlacementRequestEvent` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `createdById` to the `Facility` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `Facility` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."FacilityStatus" AS ENUM ('CLOSED', 'OPEN_NOT_ACCEPTING', 'OPEN_ACCEPTING');

-- DropForeignKey
ALTER TABLE "public"."PlacementRequest" DROP CONSTRAINT "PlacementRequest_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequest" DROP CONSTRAINT "PlacementRequest_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequest" DROP CONSTRAINT "PlacementRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequest" DROP CONSTRAINT "PlacementRequest_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequest" DROP CONSTRAINT "PlacementRequest_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequestEvent" DROP CONSTRAINT "PlacementRequestEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequestEvent" DROP CONSTRAINT "PlacementRequestEvent_placementRequestId_fkey";

-- AlterTable
ALTER TABLE "public"."Facility" ADD COLUMN     "createdById" UUID,
ADD COLUMN     "status" "public"."FacilityStatus" NOT NULL DEFAULT 'OPEN_ACCEPTING',
ADD COLUMN     "statusOther" TEXT,
ADD COLUMN     "statusReasonId" TEXT,
ADD COLUMN     "updatedById" UUID;

-- Set default values
UPDATE "public"."Facility" SET "createdById" = (SELECT "id" FROM "public"."User" WHERE "isAdmin" = true LIMIT 1);
UPDATE "public"."Facility" SET "updatedById" = (SELECT "id" FROM "public"."User" WHERE "isAdmin" = true LIMIT 1);

-- Add back NOT NULL constraints
ALTER TABLE "public"."Facility" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "public"."Facility" ALTER COLUMN "updatedById" SET NOT NULL;

-- DropTable
DROP TABLE "public"."PlacementRequest";

-- DropTable
DROP TABLE "public"."PlacementRequestEvent";

-- DropEnum
DROP TYPE "public"."PlacementRequestStatus";

-- CreateTable
CREATE TABLE "public"."FacilityUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "status" "public"."FacilityStatus" NOT NULL,
    "statusReasonId" TEXT,
    "statusOther" TEXT,
    "updateMethod" "public"."FacilityUpdateMethod" NOT NULL DEFAULT 'MANUAL',
    "updateNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "FacilityUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityStatusReason" (
    "id" TEXT NOT NULL,
    "type" "public"."FacilityType",
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "FacilityStatusReason_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_statusReasonId_fkey" FOREIGN KEY ("statusReasonId") REFERENCES "public"."FacilityStatusReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityUpdate" ADD CONSTRAINT "FacilityUpdate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityUpdate" ADD CONSTRAINT "FacilityUpdate_statusReasonId_fkey" FOREIGN KEY ("statusReasonId") REFERENCES "public"."FacilityStatusReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityUpdate" ADD CONSTRAINT "FacilityUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityStatusReason" ADD CONSTRAINT "FacilityStatusReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityStatusReason" ADD CONSTRAINT "FacilityStatusReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
