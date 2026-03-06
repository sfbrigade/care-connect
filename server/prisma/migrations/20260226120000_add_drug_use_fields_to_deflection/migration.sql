-- CreateEnum
CREATE TYPE "public"."DrugTypeEnum" AS ENUM ('INTOXICATING_LIQUOR', 'DRUG', 'TOLUENE', 'COMBINATION');

-- AlterTable
ALTER TABLE "public"."Deflection"
ADD COLUMN "drugUseEvidence" BOOLEAN,
ADD COLUMN "drugType" "public"."DrugTypeEnum";
