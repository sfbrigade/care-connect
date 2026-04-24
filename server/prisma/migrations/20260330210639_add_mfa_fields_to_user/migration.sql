/*
  Warnings:

  - A unique constraint covering the columns `[mfaToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "mfaAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaCode" TEXT,
ADD COLUMN     "mfaExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mfaLastSentAt" TIMESTAMP(3),
ADD COLUMN     "mfaToken" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "User_mfaToken_key" ON "public"."User"("mfaToken");
