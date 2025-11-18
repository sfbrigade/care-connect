-- CreateEnum
CREATE TYPE "public"."BedHoldStatus" AS ENUM ('ACTIVE', 'EXTENDED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."BedHold" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "serviceTypeId" UUID NOT NULL,
    "bedsRequested" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."BedHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "extendedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BedHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BedHold_facilityId_idx" ON "public"."BedHold"("facilityId");

-- CreateIndex
CREATE INDEX "BedHold_expiresAt_idx" ON "public"."BedHold"("expiresAt");

-- CreateIndex
CREATE INDEX "BedHold_status_idx" ON "public"."BedHold"("status");

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

