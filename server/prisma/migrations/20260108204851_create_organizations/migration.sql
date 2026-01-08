/*
  Warnings:

  - You are about to drop the column `rank` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Invite" ADD COLUMN     "badgeNumber" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "prop115Certified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titleId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "rank",
DROP COLUMN "unit",
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "prop115Certified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titleId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id","organizationId")
);

-- CreateTable
CREATE TABLE "public"."Title" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id","organizationId")
);

-- AddForeignKey
ALTER TABLE "public"."Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Title" ADD CONSTRAINT "Title_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Title" ADD CONSTRAINT "Title_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_organizationId_titleId_fkey" FOREIGN KEY ("organizationId", "titleId") REFERENCES "public"."Title"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_organizationId_unitId_fkey" FOREIGN KEY ("organizationId", "unitId") REFERENCES "public"."Unit"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_organizationId_titleId_fkey" FOREIGN KEY ("organizationId", "titleId") REFERENCES "public"."Title"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
