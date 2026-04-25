-- Phase 1 (Migration A): Additive schema changes for incident lifecycle decoupling.
-- Adds arrivedAt to Deflection, creates FacilityCheckIn and Handoff tables.
-- No destructive changes — safe to deploy before code changes.

-- Add arrivedAt to Deflection
ALTER TABLE "Deflection" ADD COLUMN "arrivedAt" TIMESTAMP(3);

-- Create FacilityCheckInEventEnum
CREATE TYPE "FacilityCheckInEventEnum" AS ENUM ('ARRIVAL', 'DEPARTURE');

-- Create FacilityCheckIn table
CREATE TABLE "FacilityCheckIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" "FacilityCheckInEventEnum" NOT NULL,
    "arrivedWithDeflectionIds" INTEGER[],

    CONSTRAINT "FacilityCheckIn_pkey" PRIMARY KEY ("id")
);

-- Create Handoff table
CREATE TABLE "Handoff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deflectionId" INTEGER NOT NULL,
    "fromOfficerId" UUID NOT NULL,
    "toOfficerId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "FacilityCheckIn_userId_facilityId_timestamp_idx" ON "FacilityCheckIn"("userId", "facilityId", "timestamp");
CREATE INDEX "Handoff_deflectionId_idx" ON "Handoff"("deflectionId");

-- Foreign keys
ALTER TABLE "FacilityCheckIn" ADD CONSTRAINT "FacilityCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FacilityCheckIn" ADD CONSTRAINT "FacilityCheckIn_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_deflectionId_fkey" FOREIGN KEY ("deflectionId") REFERENCES "Deflection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_fromOfficerId_fkey" FOREIGN KEY ("fromOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_toOfficerId_fkey" FOREIGN KEY ("toOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
