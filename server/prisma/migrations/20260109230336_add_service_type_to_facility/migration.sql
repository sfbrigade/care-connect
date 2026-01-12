/*
  Warnings:

  - Added the required column `serviceTypeId` to the `Facility` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Facility" ADD COLUMN "serviceTypeId" TEXT;

-- Add initial values for existing records
UPDATE "public"."Facility" SET "serviceTypeId" = (SELECT "serviceTypeId" FROM "public"."FacilityService" WHERE "FacilityService"."facilityId" = "Facility"."id" LIMIT 1);

-- Make the column required
ALTER TABLE "public"."Facility" ALTER COLUMN "serviceTypeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
