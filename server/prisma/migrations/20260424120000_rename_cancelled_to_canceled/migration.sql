-- Rename HoldStatusEnum value
ALTER TYPE "public"."HoldStatusEnum" RENAME VALUE 'CANCELLED' TO 'CANCELED';

-- Rename Deflection columns
ALTER TABLE "public"."Deflection" RENAME COLUMN "cancelledAt" TO "canceledAt";
ALTER TABLE "public"."Deflection" RENAME COLUMN "cancelledById" TO "canceledById";

-- Rename foreign key constraint
ALTER TABLE "public"."Deflection" RENAME CONSTRAINT "Deflection_cancelledById_fkey" TO "Deflection_canceledById_fkey";
