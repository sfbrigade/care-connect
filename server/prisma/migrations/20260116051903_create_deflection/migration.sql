/*
  Warnings:

  - You are about to drop the `BedHold` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TernaryEnum" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."HoldStatusEnum" AS ENUM ('ACTIVE', 'EXTENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SexEnum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."RaceEnum" AS ENUM ('WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."SubjectStatusEnum" AS ENUM ('DETAINED', 'ONSITE', 'AWAITING_TRANSFER', 'AWAITING_INTAKE', 'FAILED_INTAKE', 'ADMITTED', 'RELEASED', 'EXITED');

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

-- DropTable
DROP TABLE "public"."BedHold";

-- DropTable
DROP TABLE "public"."Client";

-- DropEnum
DROP TYPE "public"."BedHoldStatus";

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
    "bedStatusId" UUID NOT NULL,
    "subjectId" UUID,
    "subjectStatus" "public"."SubjectStatusEnum" NOT NULL DEFAULT 'DETAINED',
    "behavior" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
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
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_facilityId_incidentId_fkey" FOREIGN KEY ("facilityId", "incidentId") REFERENCES "public"."Incident"("facilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_facilityId_bedStatusId_fkey" FOREIGN KEY ("facilityId", "bedStatusId") REFERENCES "public"."BedStatus"("facilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
