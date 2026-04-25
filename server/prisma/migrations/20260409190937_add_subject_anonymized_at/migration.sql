-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Subject_anonymizedAt_idx" ON "public"."Subject"("anonymizedAt");
