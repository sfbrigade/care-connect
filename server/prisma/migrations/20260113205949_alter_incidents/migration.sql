/*
  Warnings:

  - The primary key for the `Incident` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `agency` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `badgeNumber` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `charge` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `dateTimeArrested` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `locationArrested` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Incident` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `Incident` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `facilityId` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_incidentId_fkey";

-- DropIndex
DROP INDEX "public"."Incident_createdById_idx";

-- AlterTable
ALTER TABLE "public"."Incident" RENAME "dateTimeArrested" TO "arrestedAt";
ALTER TABLE "public"."Incident" RENAME "locationArrested" TO "addressLine1";

ALTER TABLE "public"."Incident" DROP CONSTRAINT "Incident_pkey",
DROP COLUMN "agency",
DROP COLUMN "badgeNumber",
DROP COLUMN "charge",
DROP COLUMN "unit",
ADD COLUMN     "addressLine2" TEXT,
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
ALTER COLUMN "cadNumber" DROP NOT NULL,
ALTER COLUMN "arrestedAt" DROP NOT NULL,
ADD CONSTRAINT "Incident_pkey" PRIMARY KEY ("id", "facilityId");

-- Create a unique PARTIAL index to ensure only one uncompleted incident per user per facility is allowed
CREATE UNIQUE INDEX "Incident_facilityId_createdById_idx" ON "public"."Incident"("facilityId", "createdById") WHERE "completedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Incident_id_key" ON "public"."Incident"("id");

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_facilityId_incidentId_fkey" FOREIGN KEY ("facilityId", "incidentId") REFERENCES "public"."Incident"("facilityId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

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
