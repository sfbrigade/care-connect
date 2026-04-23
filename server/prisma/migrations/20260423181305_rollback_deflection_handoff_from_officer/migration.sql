/*
  Warnings:

  - You are about to drop the column `handoffFromOfficerId` on the `Deflection` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Deflection" DROP CONSTRAINT "Deflection_handoffFromOfficerId_fkey";

-- AlterTable
ALTER TABLE "Deflection" DROP COLUMN "handoffFromOfficerId";
