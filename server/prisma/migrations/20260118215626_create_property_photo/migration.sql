-- CreateEnum
CREATE TYPE "public"."PropertyEnum" AS ENUM ('NONE', 'SMALL', 'MEDIUM', 'LARGE');

-- AlterTable
ALTER TABLE "public"."Deflection" ADD COLUMN     "property" "public"."PropertyEnum",
ADD COLUMN     "propertyDetails" TEXT;

-- CreateTable
CREATE TABLE "public"."PropertyPhoto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deflectionId" UUID NOT NULL,
    "file" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_deflectionId_fkey" FOREIGN KEY ("deflectionId") REFERENCES "public"."Deflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
