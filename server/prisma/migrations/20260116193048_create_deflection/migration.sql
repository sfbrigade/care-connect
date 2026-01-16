/*
  Warnings:

  - The `updateMethod` column on the `Facility` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `Facility` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Facility` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `FacilityStatusReason` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updateMethod` column on the `FacilityUpdate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `BedHold` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BedStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BedStatusUpdate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `FacilityEligibility` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `FacilityUpdate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_cancelledById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_facilityId_incidentId_fkey";

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
ALTER TABLE "public"."BedStatusUpdate" DROP CONSTRAINT "BedStatusUpdate_bedStatusId_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatusUpdate" DROP CONSTRAINT "BedStatusUpdate_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BedStatusUpdate" DROP CONSTRAINT "BedStatusUpdate_updatedById_fkey";

-- DropTable
DROP TABLE "public"."BedHold";

-- DropTable
DROP TABLE "public"."Client";

-- CreateEnum
ALTER TYPE "public"."BedType" RENAME TO "BedTypeEnum";

-- CreateEnum
CREATE TYPE "public"."TernaryEnum" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
ALTER TYPE "public"."FacilityType" RENAME TO "FacilityTypeEnum";

-- CreateEnum
ALTER TYPE "public"."FacilityStatus" RENAME TO "FacilityStatusEnum";

-- CreateEnum
ALTER TYPE "public"."FacilityUpdateMethod" RENAME TO "FacilityUpdateMethodEnum";

-- CreateEnum
ALTER TYPE "public"."FacilityEligibilityType" RENAME TO "FacilityEligibilityTypeEnum";

-- CreateEnum
DROP TYPE "public"."BedHoldStatus";
CREATE TYPE "public"."HoldStatusEnum" AS ENUM ('ACTIVE', 'EXTENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SexEnum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."RaceEnum" AS ENUM ('WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."SubjectStatusEnum" AS ENUM ('DETAINED', 'ONSITE', 'AWAITING_TRANSFER', 'AWAITING_INTAKE', 'FAILED_INTAKE', 'ADMITTED', 'RELEASED', 'EXITED');

-- CreateTable
ALTER TABLE "public"."BedStatus" RENAME TO "BedType"; 
ALTER INDEX "public"."BedStatus_pkey" RENAME TO "BedType_pkey";
ALTER INDEX "public"."BedStatus_id_key" RENAME TO "BedType_id_key";

-- CreateTable
ALTER TABLE "public"."BedStatusUpdate" RENAME TO "BedTypeUpdate"; 
ALTER INDEX "public"."BedStatusUpdate_pkey" RENAME TO "BedTypeUpdate_pkey";
ALTER TABLE "public"."BedTypeUpdate" RENAME "bedStatusId" TO "bedTypeId";

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleInitial" TEXT,
    "dateOfBirth" DATE NOT NULL,
    "sex" "public"."SexEnum" NOT NULL,
    "race" "public"."RaceEnum" NOT NULL,
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
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "bedTypeId" UUID NOT NULL,
    "subjectId" UUID,
    "subjectStatus" "public"."SubjectStatusEnum" NOT NULL DEFAULT 'DETAINED',
    "behavior" TEXT,
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
    "exitDestinationId" TEXT,
    "exitHousingStatusId" TEXT,
    "exitConnectedToCare" "public"."TernaryEnum",
    "exitSFResident" "public"."TernaryEnum",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deflectionId" UUID NOT NULL,
    "status" "public"."HoldStatusEnum",
    "subjectStatus" "public"."SubjectStatusEnum",
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionCancelReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeflectionCancelReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionReleaseReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeflectionReleaseReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionRefusalReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeflectionRefusalReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionExitDestination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeflectionExitDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionExitHousingStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeflectionExitHousingStatus_pkey" PRIMARY KEY ("id")
);

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
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_exitDestinationId_fkey" FOREIGN KEY ("exitDestinationId") REFERENCES "public"."DeflectionExitDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_exitHousingStatusId_fkey" FOREIGN KEY ("exitHousingStatusId") REFERENCES "public"."DeflectionExitHousingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_deflectionId_fkey" FOREIGN KEY ("deflectionId") REFERENCES "public"."Deflection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
