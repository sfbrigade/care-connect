-- CreateEnum
CREATE TYPE "public"."EncounteredViaEnum" AS ENUM ('ON_VIEW', 'DISPATCHED');

-- AlterTable
ALTER TABLE "public"."Incident"
ADD COLUMN "encounteredVia" "public"."EncounteredViaEnum" NOT NULL DEFAULT 'DISPATCHED';

-- Drop default after backfill so new records must set an explicit value
ALTER TABLE "public"."Incident"
ALTER COLUMN "encounteredVia" DROP DEFAULT;
