-- CreateTable
CREATE TABLE "SmsOptEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phoneNumber" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "outcome" TEXT,
    "awsReason" TEXT,
    "actorUserId" UUID,
    "targetUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsOptEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsOptEvent_phoneNumber_createdAt_idx" ON "SmsOptEvent"("phoneNumber", "createdAt");
