/*
  Warnings:

  - Added the required column `createdById` to the `DeflectionCancelReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DeflectionCancelReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `DeflectionCancelReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `DeflectionExitDestination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DeflectionExitDestination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `DeflectionExitDestination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `DeflectionExitHousingStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DeflectionExitHousingStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `DeflectionExitHousingStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `DeflectionRefusalReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DeflectionRefusalReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `DeflectionRefusalReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `DeflectionReleaseReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DeflectionReleaseReason` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `DeflectionReleaseReason` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DeflectionCancelReason" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."DeflectionExitDestination" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."DeflectionExitHousingStatus" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."DeflectionRefusalReason" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."DeflectionReleaseReason" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."DeflectionCancelReason" ADD CONSTRAINT "DeflectionCancelReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionCancelReason" ADD CONSTRAINT "DeflectionCancelReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionReleaseReason" ADD CONSTRAINT "DeflectionReleaseReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionReleaseReason" ADD CONSTRAINT "DeflectionReleaseReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionRefusalReason" ADD CONSTRAINT "DeflectionRefusalReason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionRefusalReason" ADD CONSTRAINT "DeflectionRefusalReason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitDestination" ADD CONSTRAINT "DeflectionExitDestination_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitDestination" ADD CONSTRAINT "DeflectionExitDestination_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitHousingStatus" ADD CONSTRAINT "DeflectionExitHousingStatus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionExitHousingStatus" ADD CONSTRAINT "DeflectionExitHousingStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
