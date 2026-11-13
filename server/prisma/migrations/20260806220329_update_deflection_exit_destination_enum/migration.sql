-- AlterEnum
BEGIN;

ALTER TYPE "public"."DeflectionExitDestinationEnum" RENAME VALUE 'HOSPITAL' TO 'HOSPITAL_EMS';
ALTER TYPE "public"."DeflectionExitDestinationEnum" RENAME VALUE 'HOME' TO 'RESIDENCE';
ALTER TYPE "public"."DeflectionExitDestinationEnum" ADD VALUE 'UNKNOWN';

COMMIT;
