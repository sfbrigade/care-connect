-- CreateEnum
CREATE TYPE "NotifiableEventEnum" AS ENUM ('NEW_HOLD', 'ARRIVAL', 'EXIT');

-- AlterTable
ALTER TABLE "Deflection" ADD COLUMN     "newHoldNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentFacilityId" UUID,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "smsBannerDismissedAt" TIMESTAMP(3),
ADD COLUMN     "smsBannerRemindAfter" TIMESTAMP(3),
ADD COLUMN     "smsBannerRemindCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "smsConsentAt" TIMESTAMP(3),
ADD COLUMN     "smsOptedOutAt" TIMESTAMP(3),
ADD COLUMN     "smsOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "smsOtpCode" TEXT,
ADD COLUMN     "smsOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "smsOtpLastSentAt" TIMESTAMP(3),
ADD COLUMN     "smsWelcomedAt" TIMESTAMP(3),
ADD COLUMN     "subscribedEvents" "NotifiableEventEnum"[] DEFAULT ARRAY[]::"NotifiableEventEnum"[];

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentFacilityId_fkey" FOREIGN KEY ("currentFacilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
