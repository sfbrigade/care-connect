-- Phase 1 (Migration B): Destructive schema changes for incident lifecycle decoupling.
-- Removes lifecycle fields from Incident and drops the IncidentOfficer table.
-- Deploy only after all code changes are live.

-- Drop IncidentOfficer table
DROP TABLE IF EXISTS "IncidentOfficer";

-- Drop IncidentOfficerRoleEnum
DROP TYPE IF EXISTS "IncidentOfficerRoleEnum";

-- Remove lifecycle fields from Incident
ALTER TABLE "Incident" DROP COLUMN IF EXISTS "arrivedAt";
ALTER TABLE "Incident" DROP COLUMN IF EXISTS "leftAt";
ALTER TABLE "Incident" DROP COLUMN IF EXISTS "completedAt";
