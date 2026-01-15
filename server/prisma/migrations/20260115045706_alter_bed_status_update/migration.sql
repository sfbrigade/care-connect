/*
  Warnings:

  - The primary key for the `BedStatus` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `BedStatus` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `facilityId` to the `BedStatusUpdate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."BedStatusUpdate" DROP CONSTRAINT "BedStatusUpdate_bedStatusId_fkey";

-- AlterTable
ALTER TABLE "public"."BedStatus" DROP CONSTRAINT "BedStatus_pkey",
ADD CONSTRAINT "BedStatus_pkey" PRIMARY KEY ("id", "facilityId");

-- AlterTable
ALTER TABLE "public"."BedStatusUpdate" ADD COLUMN     "facilityId" UUID;
UPDATE "public"."BedStatusUpdate" SET "facilityId" = (SELECT "facilityId" FROM "public"."BedStatus" WHERE "id" = "bedStatusId");
ALTER TABLE "public"."BedStatusUpdate" ALTER COLUMN "facilityId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BedStatus_id_key" ON "public"."BedStatus"("id");

-- AddForeignKey
ALTER TABLE "public"."BedStatusUpdate" ADD CONSTRAINT "BedStatusUpdate_bedStatusId_facilityId_fkey" FOREIGN KEY ("bedStatusId", "facilityId") REFERENCES "public"."BedStatus"("id", "facilityId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedStatusUpdate" ADD CONSTRAINT "BedStatusUpdate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
