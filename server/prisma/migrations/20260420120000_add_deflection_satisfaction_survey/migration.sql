-- CreateTable
CREATE TABLE "public"."SatisfactionSurvey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department" TEXT NOT NULL,
    "careConnectRating" TEXT NOT NULL,
    "improvementSuggestions" TEXT,
    "resetFacilityFeedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatisfactionSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SatisfactionSurvey_createdAt_idx" ON "public"."SatisfactionSurvey"("createdAt");
