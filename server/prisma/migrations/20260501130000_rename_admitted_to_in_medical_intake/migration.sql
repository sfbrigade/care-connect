ALTER TYPE "public"."SubjectStatusEnum"
RENAME VALUE 'ADMITTED' TO 'IN_MEDICAL_INTAKE';

ALTER TABLE "public"."Deflection"
RENAME COLUMN "admittedAt" TO "beginMedicalIntakeAt";

ALTER TABLE "public"."Deflection"
RENAME COLUMN "admittedById" TO "beginMedicalIntakeById";
