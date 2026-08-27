/*
  Warnings:

  - The values [TEMPORARY] on the enum `DeflectionExitHousingStatusEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."DeflectionExitHousingStatusEnum_new" AS ENUM ('PERMANENTLY_HOUSED', 'TEMPORARY_SHELTER', 'UNKNOWN', 'DECLINED_CONSENT', 'NO_SHELTER_STREET');
ALTER TABLE "public"."Deflection" ALTER COLUMN "exitHousingStatus" TYPE "public"."DeflectionExitHousingStatusEnum_new" USING ("exitHousingStatus"::text::"public"."DeflectionExitHousingStatusEnum_new");
ALTER TABLE "public"."DeflectionUpdate" ALTER COLUMN "exitHousingStatus" TYPE "public"."DeflectionExitHousingStatusEnum_new" USING ("exitHousingStatus"::text::"public"."DeflectionExitHousingStatusEnum_new");
ALTER TYPE "public"."DeflectionExitHousingStatusEnum" RENAME TO "DeflectionExitHousingStatusEnum_old";
ALTER TYPE "public"."DeflectionExitHousingStatusEnum_new" RENAME TO "DeflectionExitHousingStatusEnum";
DROP TYPE "public"."DeflectionExitHousingStatusEnum_old";
COMMIT;
