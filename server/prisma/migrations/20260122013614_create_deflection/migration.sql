/*
  Warnings:

  - The `updateMethod` column on the `Facility` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `Facility` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Facility` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `FacilityStatusReason` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updateMethod` column on the `FacilityUpdate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Incident` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `agency` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `badgeNumber` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `charge` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `dateTimeArrested` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `locationArrested` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Incident` table. All the data in the column will be lost.
  - The `id` column on the `Incident` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `BedHold` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BedStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BedStatusUpdate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id]` on the table `Incident` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `FacilityEligibility` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `FacilityUpdate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `facilityId` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BedTypeEnum" AS ENUM ('BED', 'CHAIR');

-- CreateEnum
CREATE TYPE "public"."TernaryEnum" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."FacilityTypeEnum" AS ENUM ('DIDO', 'LESC');

-- CreateEnum
CREATE TYPE "public"."FacilityStatusEnum" AS ENUM ('CLOSED', 'OPEN_NOT_ACCEPTING', 'OPEN_ACCEPTING');

-- CreateEnum
CREATE TYPE "public"."FacilityUpdateMethodEnum" AS ENUM ('INTEGRATION', 'API', 'MANUAL', 'AUTOMATED_CALL', 'AUTOMATED_TEXT', 'WHITEBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FacilityEligibilityTypeEnum" AS ENUM ('AGE', 'GENDER', 'AMBULATORY', 'MOBILITY_DEVICES', 'ADL_INDEPENDENT', 'HOUSING_STATUS', 'NEIGHBORHOOD', 'SEXUAL_ORIENTATION', 'RACE', 'LANGUAGE', 'PETS', 'BELONGINGS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HoldStatusEnum" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."PropertyEnum" AS ENUM ('NONE', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "public"."RaceEnum" AS ENUM ('WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."SexEnum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."SubjectStatusEnum" AS ENUM ('DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE', 'FAILED_INTAKE', 'ADMITTED', 'RELEASED', 'EXITED');

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_cancelledById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_transferredById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatus" DROP CONSTRAINT "BedStatus_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatus" DROP CONSTRAINT "BedStatus_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatus" DROP CONSTRAINT "BedStatus_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatusUpdate" DROP CONSTRAINT "BedStatusUpdate_bedStatusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatusUpdate" DROP CONSTRAINT "BedStatusUpdate_updatedById_fkey";

-- DropIndex
DROP INDEX "public"."Incident_createdById_idx";

-- AlterTable
DELETE FROM "public"."Facility";
ALTER TABLE "public"."Facility" DROP COLUMN "updateMethod",
ADD COLUMN     "updateMethod" "public"."FacilityUpdateMethodEnum" NOT NULL DEFAULT 'MANUAL',
DROP COLUMN "type",
ADD COLUMN     "type" "public"."FacilityTypeEnum" NOT NULL DEFAULT 'DIDO',
DROP COLUMN "status",
ADD COLUMN     "status" "public"."FacilityStatusEnum" NOT NULL DEFAULT 'OPEN_ACCEPTING';

-- AlterTable
DELETE FROM "public"."FacilityEligibility";
ALTER TABLE "public"."FacilityEligibility" DROP COLUMN "type",
ADD COLUMN     "type" "public"."FacilityEligibilityTypeEnum" NOT NULL;

-- AlterTable
DELETE FROM "public"."FacilityStatusReason";
ALTER TABLE "public"."FacilityStatusReason" DROP COLUMN "type",
ADD COLUMN     "type" "public"."FacilityTypeEnum";

-- AlterTable
DELETE FROM "public"."FacilityUpdate";
ALTER TABLE "public"."FacilityUpdate" DROP COLUMN "status",
ADD COLUMN     "status" "public"."FacilityStatusEnum" NOT NULL,
DROP COLUMN "updateMethod",
ADD COLUMN     "updateMethod" "public"."FacilityUpdateMethodEnum" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
DELETE FROM "public"."Incident";
ALTER TABLE "public"."Incident" DROP CONSTRAINT "Incident_pkey",
DROP COLUMN "agency",
DROP COLUMN "badgeNumber",
DROP COLUMN "charge",
DROP COLUMN "dateTimeArrested",
DROP COLUMN "locationArrested",
DROP COLUMN "unit",
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "arrestedAt" TIMESTAMP(3),
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdByBadgeNumber" TEXT,
ADD COLUMN     "createdByOrganizationId" TEXT,
ADD COLUMN     "createdByTitleId" TEXT,
ADD COLUMN     "createdByUnitId" TEXT,
ADD COLUMN     "facilityId" UUID NOT NULL,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "leftAt" TIMESTAMP(3),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "supervisorBadgeNumber" TEXT,
ADD COLUMN     "updatedById" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "cadNumber" DROP NOT NULL,
ADD CONSTRAINT "Incident_pkey" PRIMARY KEY ("id", "facilityId");

-- DropTable
DROP TABLE "public"."BedHold";

-- DropTable
DROP TABLE "public"."BedStatus";

-- DropTable
DROP TABLE "public"."BedStatusUpdate";

-- DropTable
DROP TABLE "public"."Client";

-- DropEnum
DROP TYPE "public"."BedHoldStatus";

-- DropEnum
DROP TYPE "public"."BedType";

-- DropEnum
DROP TYPE "public"."FacilityEligibilityType";

-- DropEnum
DROP TYPE "public"."FacilityStatus";

-- DropEnum
DROP TYPE "public"."FacilityType";

-- DropEnum
DROP TYPE "public"."FacilityUpdateMethod";

-- CreateTable
CREATE TABLE "public"."BedType" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "type" "public"."BedTypeEnum" NOT NULL DEFAULT 'BED',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "unavailableUnoccupied" INTEGER NOT NULL DEFAULT 0,
    "unavailableOccupied" INTEGER NOT NULL DEFAULT 0,
    "occupied" INTEGER NOT NULL DEFAULT 0,
    "holds" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updateMethod" "public"."FacilityUpdateMethodEnum" NOT NULL DEFAULT 'MANUAL',
    "updateNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "BedType_pkey" PRIMARY KEY ("id","facilityId")
);

-- CreateTable
CREATE TABLE "public"."BedTypeUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bedTypeId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "unavailableUnoccupied" INTEGER NOT NULL DEFAULT 0,
    "unavailableOccupied" INTEGER NOT NULL DEFAULT 0,
    "occupied" INTEGER NOT NULL DEFAULT 0,
    "holds" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "updateMethod" "public"."FacilityUpdateMethodEnum" NOT NULL DEFAULT 'MANUAL',
    "updateNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "BedTypeUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT,
    "lastName" TEXT,
    "middleInitial" TEXT,
    "dateOfBirth" DATE,
    "sex" "public"."SexEnum",
    "race" "public"."RaceEnum",
    "driverLicense" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "localId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deflection" (
    "id" SERIAL NOT NULL,
    "facilityId" UUID NOT NULL,
    "incidentId" INTEGER NOT NULL,
    "bedTypeId" UUID NOT NULL,
    "subjectId" UUID,
    "subjectStatus" "public"."SubjectStatusEnum" NOT NULL DEFAULT 'DETAINED',
    "narcoticsSubstance" BOOLEAN,
    "narcoticsParaphernalia" BOOLEAN,
    "behavior" TEXT,
    "property" "public"."PropertyEnum",
    "propertyDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '01:00:00'::interval),
    "completedAt" TIMESTAMP(3),
    "status" "public"."HoldStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "cancelReasonId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "transferredAt" TIMESTAMP(3),
    "transferredById" UUID,
    "transferredByBadgeNumber" TEXT,
    "transferredByProp115Certified" BOOLEAN,
    "transferredByOrganizationId" TEXT,
    "transferredByUnitId" TEXT,
    "transferredByTitleId" TEXT,
    "admittedAt" TIMESTAMP(3),
    "admittedById" UUID,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" UUID,
    "releasedAt" TIMESTAMP(3),
    "releasedById" UUID,
    "releaseReasonId" TEXT,
    "refusalReasonId" TEXT,
    "exitedAt" TIMESTAMP(3),
    "exitedById" UUID,
    "exitDestinationId" TEXT,
    "exitHousingStatusId" TEXT,
    "exitConnectedToCare" "public"."TernaryEnum",
    "exitSFResident" "public"."TernaryEnum",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionDetailCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeflectionDetailCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionDetail" (
    "id" TEXT NOT NULL,
    "deflectionDetailCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeflectionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deflectionId" INTEGER NOT NULL,
    "status" "public"."HoldStatusEnum",
    "expiresAt" TIMESTAMP(3),
    "extensionCount" INTEGER,
    "cancelReasonId" TEXT,
    "subjectStatus" "public"."SubjectStatusEnum",
    "releaseReasonId" TEXT,
    "refusalReasonId" TEXT,
    "exitDestinationId" TEXT,
    "exitHousingStatusId" TEXT,
    "exitConnectedToCare" "public"."TernaryEnum",
    "exitSFResident" "public"."TernaryEnum",
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionCancelReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionCancelReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionReleaseReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionReleaseReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionRefusalReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionRefusalReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionExitDestination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionExitDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionExitHousingStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionExitHousingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PropertyPhoto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deflectionId" INTEGER NOT NULL,
    "file" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DeflectionToDeflectionDetail" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DeflectionToDeflectionDetail_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BedType_id_key" ON "public"."BedType"("id");

-- CreateIndex
CREATE INDEX "_DeflectionToDeflectionDetail_B_index" ON "public"."_DeflectionToDeflectionDetail"("B");

-- CreateIndex
CREATE INDEX "FacilityEligibility_facilityId_type_idx" ON "public"."FacilityEligibility"("facilityId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_id_key" ON "public"."Incident"("id");

-- AddForeignKey
ALTER TABLE "public"."BedType" ADD CONSTRAINT "BedType_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedType" ADD CONSTRAINT "BedType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedType" ADD CONSTRAINT "BedType_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedTypeUpdate" ADD CONSTRAINT "BedTypeUpdate_bedTypeId_facilityId_fkey" FOREIGN KEY ("bedTypeId", "facilityId") REFERENCES "public"."BedType"("id", "facilityId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedTypeUpdate" ADD CONSTRAINT "BedTypeUpdate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedTypeUpdate" ADD CONSTRAINT "BedTypeUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_facilityId_incidentId_fkey" FOREIGN KEY ("facilityId", "incidentId") REFERENCES "public"."Incident"("facilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_facilityId_bedTypeId_fkey" FOREIGN KEY ("facilityId", "bedTypeId") REFERENCES "public"."BedType"("facilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_cancelReasonId_fkey" FOREIGN KEY ("cancelReasonId") REFERENCES "public"."DeflectionCancelReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_transferredByOrganizationId_fkey" FOREIGN KEY ("transferredByOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_transferredByOrganizationId_transferredByUnitId_fkey" FOREIGN KEY ("transferredByOrganizationId", "transferredByUnitId") REFERENCES "public"."Unit"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_transferredByOrganizationId_transferredByTitleI_fkey" FOREIGN KEY ("transferredByOrganizationId", "transferredByTitleId") REFERENCES "public"."Title"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_admittedById_fkey" FOREIGN KEY ("admittedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_releaseReasonId_fkey" FOREIGN KEY ("releaseReasonId") REFERENCES "public"."DeflectionReleaseReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_refusalReasonId_fkey" FOREIGN KEY ("refusalReasonId") REFERENCES "public"."DeflectionRefusalReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_exitedById_fkey" FOREIGN KEY ("exitedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_exitDestinationId_fkey" FOREIGN KEY ("exitDestinationId") REFERENCES "public"."DeflectionExitDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_exitHousingStatusId_fkey" FOREIGN KEY ("exitHousingStatusId") REFERENCES "public"."DeflectionExitHousingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetailCategory" ADD CONSTRAINT "DeflectionDetailCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetailCategory" ADD CONSTRAINT "DeflectionDetailCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetail" ADD CONSTRAINT "DeflectionDetail_deflectionDetailCategoryId_fkey" FOREIGN KEY ("deflectionDetailCategoryId") REFERENCES "public"."DeflectionDetailCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetail" ADD CONSTRAINT "DeflectionDetail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetail" ADD CONSTRAINT "DeflectionDetail_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_deflectionId_fkey" FOREIGN KEY ("deflectionId") REFERENCES "public"."Deflection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_cancelReasonId_fkey" FOREIGN KEY ("cancelReasonId") REFERENCES "public"."DeflectionCancelReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_releaseReasonId_fkey" FOREIGN KEY ("releaseReasonId") REFERENCES "public"."DeflectionReleaseReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_refusalReasonId_fkey" FOREIGN KEY ("refusalReasonId") REFERENCES "public"."DeflectionRefusalReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_exitDestinationId_fkey" FOREIGN KEY ("exitDestinationId") REFERENCES "public"."DeflectionExitDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_exitHousingStatusId_fkey" FOREIGN KEY ("exitHousingStatusId") REFERENCES "public"."DeflectionExitHousingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionCancelReason" ADD CONSTRAINT "DeflectionCancelReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionCancelReason" ADD CONSTRAINT "DeflectionCancelReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionReleaseReason" ADD CONSTRAINT "DeflectionReleaseReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionReleaseReason" ADD CONSTRAINT "DeflectionReleaseReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionRefusalReason" ADD CONSTRAINT "DeflectionRefusalReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionRefusalReason" ADD CONSTRAINT "DeflectionRefusalReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitDestination" ADD CONSTRAINT "DeflectionExitDestination_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitDestination" ADD CONSTRAINT "DeflectionExitDestination_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitHousingStatus" ADD CONSTRAINT "DeflectionExitHousingStatus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitHousingStatus" ADD CONSTRAINT "DeflectionExitHousingStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_deflectionId_fkey" FOREIGN KEY ("deflectionId") REFERENCES "public"."Deflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_createdByOrganizationId_fkey" FOREIGN KEY ("createdByOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_createdByOrganizationId_createdByTitleId_fkey" FOREIGN KEY ("createdByOrganizationId", "createdByTitleId") REFERENCES "public"."Title"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_createdByOrganizationId_createdByUnitId_fkey" FOREIGN KEY ("createdByOrganizationId", "createdByUnitId") REFERENCES "public"."Unit"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DeflectionToDeflectionDetail" ADD CONSTRAINT "_DeflectionToDeflectionDetail_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Deflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DeflectionToDeflectionDetail" ADD CONSTRAINT "_DeflectionToDeflectionDetail_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."DeflectionDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
