BEGIN;

UPDATE "public"."Deflection" SET "exitHousingStatus" = 'UNKNOWN' WHERE "exitHousingStatus" = 'TEMPORARY';
UPDATE "public"."DeflectionUpdate" SET "exitHousingStatus" = 'UNKNOWN' WHERE "exitHousingStatus" = 'TEMPORARY';

ALTER TYPE "public"."DeflectionExitHousingStatusEnum" RENAME VALUE 'PERMANENT' TO 'PERMANENTLY_HOUSED';
ALTER TYPE "public"."DeflectionExitHousingStatusEnum" RENAME VALUE 'SHELTERED' TO 'TEMPORARY_SHELTER';
ALTER TYPE "public"."DeflectionExitHousingStatusEnum" ADD VALUE 'NO_SHELTER_STREET';

COMMIT;
