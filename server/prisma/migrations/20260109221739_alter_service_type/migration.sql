/*
  Warnings:

  - The primary key for the `FacilityService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ServiceType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `ServiceType` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BedHold" DROP CONSTRAINT "BedHold_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FacilityService" DROP CONSTRAINT "FacilityService_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlacementRequest" DROP CONSTRAINT "PlacementRequest_serviceTypeId_fkey";

-- DropIndex
DROP INDEX "public"."ServiceType_code_key";

-- AlterTable
ALTER TABLE "public"."BedHold" ALTER COLUMN "serviceTypeId" SET DATA TYPE TEXT USING "serviceTypeId"::TEXT;

-- AlterTable
ALTER TABLE "public"."FacilityService" DROP CONSTRAINT "FacilityService_pkey",
ALTER COLUMN "serviceTypeId" SET DATA TYPE TEXT USING "serviceTypeId"::TEXT,
ADD CONSTRAINT "FacilityService_pkey" PRIMARY KEY ("facilityId", "serviceTypeId");

-- AlterTable
ALTER TABLE "public"."PlacementRequest" ALTER COLUMN "serviceTypeId" SET DATA TYPE TEXT USING "serviceTypeId"::TEXT;

-- Update/migrate values
UPDATE "public"."BedHold" SET "serviceTypeId" = (SELECT LOWER("code") FROM "public"."ServiceType" WHERE "id"::TEXT = "serviceTypeId");
UPDATE "public"."FacilityService" SET "serviceTypeId" = (SELECT LOWER("code") FROM "public"."ServiceType" WHERE "id"::TEXT = "serviceTypeId");
UPDATE "public"."PlacementRequest" SET "serviceTypeId" = (SELECT LOWER("code") FROM "public"."ServiceType" WHERE "id"::TEXT = "serviceTypeId");

-- AlterTable
ALTER TABLE "public"."ServiceType" DROP CONSTRAINT "ServiceType_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT USING id::TEXT,
ADD CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id");

-- Update/migrate values
UPDATE "public"."ServiceType" SET "id" = LOWER("code");

-- DropColumn
ALTER TABLE "public"."ServiceType" DROP COLUMN "code";

-- AddForeignKey
ALTER TABLE "public"."FacilityService" ADD CONSTRAINT "FacilityService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequest" ADD CONSTRAINT "PlacementRequest_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
