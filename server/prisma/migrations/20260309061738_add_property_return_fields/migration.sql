-- CreateEnum
CREATE TYPE "public"."PropertyNotReturnedReasonEnum" AS ENUM ('ABANDONED', 'DESTROYED', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Deflection" ADD COLUMN     "propertyNotReturnedOtherReason" TEXT,
ADD COLUMN     "propertyNotReturnedReason" "public"."PropertyNotReturnedReasonEnum",
ADD COLUMN     "propertyReturned" BOOLEAN,
ADD COLUMN     "propertyReturnedAt" TIMESTAMP(3),
ADD COLUMN     "propertyReturnedById" UUID;

-- AlterTable
ALTER TABLE "public"."DeflectionUpdate" ADD COLUMN     "propertyNotReturnedOtherReason" TEXT,
ADD COLUMN     "propertyNotReturnedReason" "public"."PropertyNotReturnedReasonEnum",
ADD COLUMN     "propertyReturned" BOOLEAN;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_propertyReturnedById_fkey" FOREIGN KEY ("propertyReturnedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
