/*
  Warnings:

  - The values [ONSITE,AWAITING_TRANSFER] on the enum `SubjectStatusEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."SubjectStatusEnum_new" AS ENUM ('DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE', 'FAILED_INTAKE', 'ADMITTED', 'RELEASED', 'EXITED');
ALTER TABLE "public"."Deflection" ALTER COLUMN "subjectStatus" DROP DEFAULT;
ALTER TABLE "public"."Deflection" ALTER COLUMN "subjectStatus" TYPE "public"."SubjectStatusEnum_new" USING ("subjectStatus"::text::"public"."SubjectStatusEnum_new");
ALTER TABLE "public"."DeflectionUpdate" ALTER COLUMN "subjectStatus" TYPE "public"."SubjectStatusEnum_new" USING ("subjectStatus"::text::"public"."SubjectStatusEnum_new");
ALTER TYPE "public"."SubjectStatusEnum" RENAME TO "SubjectStatusEnum_old";
ALTER TYPE "public"."SubjectStatusEnum_new" RENAME TO "SubjectStatusEnum";
DROP TYPE "public"."SubjectStatusEnum_old";
ALTER TABLE "public"."Deflection" ALTER COLUMN "subjectStatus" SET DEFAULT 'DETAINED';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Deflection" ADD COLUMN     "exitedAt" TIMESTAMP(3),
ADD COLUMN     "exitedById" UUID;

-- AlterTable
ALTER TABLE "public"."DeflectionUpdate" ADD COLUMN     "cancelReasonId" TEXT,
ADD COLUMN     "exitConnectedToCare" "public"."TernaryEnum",
ADD COLUMN     "exitDestinationId" TEXT,
ADD COLUMN     "exitHousingStatusId" TEXT,
ADD COLUMN     "exitSFResident" "public"."TernaryEnum",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "refusalReasonId" TEXT,
ADD COLUMN     "releaseReasonId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_exitedById_fkey" FOREIGN KEY ("exitedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_cancelReasonId_fkey" FOREIGN KEY ("cancelReasonId") REFERENCES "public"."DeflectionCancelReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_releaseReasonId_fkey" FOREIGN KEY ("releaseReasonId") REFERENCES "public"."DeflectionReleaseReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_refusalReasonId_fkey" FOREIGN KEY ("refusalReasonId") REFERENCES "public"."DeflectionRefusalReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_exitDestinationId_fkey" FOREIGN KEY ("exitDestinationId") REFERENCES "public"."DeflectionExitDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionUpdate" ADD CONSTRAINT "DeflectionUpdate_exitHousingStatusId_fkey" FOREIGN KEY ("exitHousingStatusId") REFERENCES "public"."DeflectionExitHousingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
