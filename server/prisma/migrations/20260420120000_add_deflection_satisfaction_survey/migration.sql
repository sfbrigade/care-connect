-- CreateTable
CREATE TABLE "public"."SatisfactionSurvey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "careConnectRating" TEXT NOT NULL,
    "improvementSuggestions" TEXT,
    "resetFacilityFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatisfactionSurvey_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SatisfactionSurvey_createdAt_idx" ON "public"."SatisfactionSurvey"("createdAt");

-- CreateIndex
CREATE INDEX "SatisfactionSurvey_organizationId_idx" ON "public"."SatisfactionSurvey"("organizationId");
