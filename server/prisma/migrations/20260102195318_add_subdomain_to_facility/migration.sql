/*
  Warnings:

  - You are about to drop the `FacilityAmenity` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[subdomain]` on the table `Facility` will be added. If there are existing duplicate values, this will fail.
  - Made the column `createdById` on table `BedHold` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `FacilityService` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."FacilityType" AS ENUM ('DIDO', 'LESC');

-- DropForeignKey
ALTER TABLE "public"."FacilityAmenity" DROP CONSTRAINT "FacilityAmenity_amenityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FacilityAmenity" DROP CONSTRAINT "FacilityAmenity_facilityId_fkey";

-- AlterTable
ALTER TABLE "public"."BedHold" ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Facility" ADD COLUMN     "subdomain" CITEXT,
ADD COLUMN     "type" "public"."FacilityType" NOT NULL DEFAULT 'DIDO';

-- AlterTable
ALTER TABLE "public"."FacilityService" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."FacilityService" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."FacilityAmenity";

-- CreateTable
CREATE TABLE "public"."_AmenityToFacility" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AmenityToFacility_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AmenityToFacility_B_index" ON "public"."_AmenityToFacility"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_subdomain_key" ON "public"."Facility"("subdomain");

-- AddForeignKey
ALTER TABLE "public"."_AmenityToFacility" ADD CONSTRAINT "_AmenityToFacility_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AmenityToFacility" ADD CONSTRAINT "_AmenityToFacility_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
