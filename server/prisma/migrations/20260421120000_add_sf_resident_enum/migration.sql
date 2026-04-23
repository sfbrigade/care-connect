-- CreateEnum
CREATE TYPE "public"."SFResidentEnum" AS ENUM ('YES', 'NO', 'UNKNOWN', 'DECLINED_CONSENT');

-- AlterTable
ALTER TABLE "public"."Deflection"
ALTER COLUMN "exitSFResident" TYPE "public"."SFResidentEnum"
USING "exitSFResident"::text::"public"."SFResidentEnum";

-- AlterTable
ALTER TABLE "public"."DeflectionUpdate"
ALTER COLUMN "exitSFResident" TYPE "public"."SFResidentEnum"
USING "exitSFResident"::text::"public"."SFResidentEnum";
