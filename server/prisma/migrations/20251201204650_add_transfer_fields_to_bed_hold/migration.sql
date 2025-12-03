-- AlterEnum
ALTER TYPE "public"."BedHoldStatus" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "public"."BedHold" ADD COLUMN "transferredAt" TIMESTAMP(3),
ADD COLUMN "transferredById" UUID,
ADD COLUMN "transferToken" TEXT,
ADD COLUMN "transferTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "BedHold_transferToken_key" ON "public"."BedHold"("transferToken");

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



