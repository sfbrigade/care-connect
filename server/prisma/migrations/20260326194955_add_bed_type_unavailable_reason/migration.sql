-- AlterTable
ALTER TABLE "public"."BedType" ADD COLUMN     "unavailableOther" TEXT,
ADD COLUMN     "unavailableReasonId" UUID;

-- AlterTable
ALTER TABLE "public"."BedTypeUpdate" ADD COLUMN     "unavailableOther" TEXT,
ADD COLUMN     "unavailableReasonId" UUID;

-- CreateTable
CREATE TABLE "public"."BedTypeUnavailableReason" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "BedTypeUnavailableReason_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."BedTypeUnavailableReason" ADD CONSTRAINT "BedTypeUnavailableReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedTypeUnavailableReason" ADD CONSTRAINT "BedTypeUnavailableReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedType" ADD CONSTRAINT "BedType_unavailableReasonId_fkey" FOREIGN KEY ("unavailableReasonId") REFERENCES "public"."BedTypeUnavailableReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedTypeUpdate" ADD CONSTRAINT "BedTypeUpdate_unavailableReasonId_fkey" FOREIGN KEY ("unavailableReasonId") REFERENCES "public"."BedTypeUnavailableReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
