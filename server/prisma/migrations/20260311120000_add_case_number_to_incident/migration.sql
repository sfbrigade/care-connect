ALTER TABLE "Incident"
ADD COLUMN "caseNumber" TEXT;

CREATE INDEX "Incident_caseNumber_idx" ON "Incident"("caseNumber");
