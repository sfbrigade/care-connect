-- Create enum types
CREATE TYPE "DeflectionCancelReasonEnum" AS ENUM ('BEHAVIORAL_HEALTH_EVALUATION', 'JAIL', 'HOSPITAL', 'RELEASE_ON_SCENE', 'NO_CHAIRS_AVAILABLE', 'STAFFING_SHORTAGE');
CREATE TYPE "DeflectionReleaseReasonEnum" AS ENUM ('SOBERED', 'MEDICAL_ISSUE', 'BEHAVIORAL_HEALTH_EVALUATION', 'OTHER', 'DEATH_IN_FACILITY', 'DEATH_IN_CUSTODY');
CREATE TYPE "DeflectionRefusalReasonEnum" AS ENUM ('AGGRESSIVE_BEHAVIOR', 'MEDICAL_ISSUE');
CREATE TYPE "DeflectionExitDestinationEnum" AS ENUM ('JAIL', 'HOSPITAL', 'STREET', 'HOME', 'SERVICES_NON_HOSPITAL', 'DECLINED_CONSENT', 'OTHER');
CREATE TYPE "DeflectionExitHousingStatusEnum" AS ENUM ('PERMANENT', 'SHELTERED', 'TEMPORARY', 'UNKNOWN', 'DECLINED_CONSENT');
CREATE TYPE "FacilityStatusReasonEnum" AS ENUM ('BUILDING_ISSUE', 'SAFETY_LOCKDOWN', 'OTHER', 'SFSO_STAFFING', 'CONNECTIONS_STAFFING');
CREATE TYPE "BedTypeUnavailableReasonEnum" AS ENUM ('SFSD_STAFFING', 'CONTRACTOR_STAFFING', 'BUILDING_ISSUE', 'SAFETY_LOCKDOWN', 'OTHER');

-- Add new enum columns to Deflection
ALTER TABLE "Deflection" ADD COLUMN "cancelReason" "DeflectionCancelReasonEnum";
ALTER TABLE "Deflection" ADD COLUMN "releaseReason" "DeflectionReleaseReasonEnum";
ALTER TABLE "Deflection" ADD COLUMN "refusalReason" "DeflectionRefusalReasonEnum";
ALTER TABLE "Deflection" ADD COLUMN "exitDestination" "DeflectionExitDestinationEnum";
ALTER TABLE "Deflection" ADD COLUMN "exitHousingStatus" "DeflectionExitHousingStatusEnum";

-- Backfill Deflection enum columns
UPDATE "Deflection" SET "cancelReason" = CASE "cancelReasonId"
  WHEN '5150'                THEN 'BEHAVIORAL_HEALTH_EVALUATION'
  WHEN 'jail'                THEN 'JAIL'
  WHEN 'hospital'            THEN 'HOSPITAL'
  WHEN 'release_on_scene'    THEN 'RELEASE_ON_SCENE'
  WHEN 'no_chairs_available' THEN 'NO_CHAIRS_AVAILABLE'
  WHEN 'staffing_shortage'   THEN 'STAFFING_SHORTAGE'
END::"DeflectionCancelReasonEnum"
WHERE "cancelReasonId" IS NOT NULL;

UPDATE "Deflection" SET "releaseReason" = CASE "releaseReasonId"
  WHEN 'sobered'                      THEN 'SOBERED'
  WHEN 'medical_issue'                THEN 'MEDICAL_ISSUE'
  WHEN 'behavioral_health_evaluation' THEN 'BEHAVIORAL_HEALTH_EVALUATION'
  WHEN 'other'                        THEN 'OTHER'
  WHEN 'death_in_facility'            THEN 'DEATH_IN_FACILITY'
  WHEN 'death_in_custody'             THEN 'DEATH_IN_CUSTODY'
END::"DeflectionReleaseReasonEnum"
WHERE "releaseReasonId" IS NOT NULL;

UPDATE "Deflection" SET "refusalReason" = CASE "refusalReasonId"
  WHEN 'aggressive_behavior' THEN 'AGGRESSIVE_BEHAVIOR'
  WHEN 'medical_issue'       THEN 'MEDICAL_ISSUE'
END::"DeflectionRefusalReasonEnum"
WHERE "refusalReasonId" IS NOT NULL;

UPDATE "Deflection" SET "exitDestination" = CASE "exitDestinationId"
  WHEN 'jail'                 THEN 'JAIL'
  WHEN 'hospital'             THEN 'HOSPITAL'
  WHEN 'street'               THEN 'STREET'
  WHEN 'home'                 THEN 'HOME'
  WHEN 'services_non_hospital' THEN 'SERVICES_NON_HOSPITAL'
  WHEN 'declined_consent'     THEN 'DECLINED_CONSENT'
  WHEN 'other'                THEN 'OTHER'
END::"DeflectionExitDestinationEnum"
WHERE "exitDestinationId" IS NOT NULL;

UPDATE "Deflection" SET "exitHousingStatus" = CASE "exitHousingStatusId"
  WHEN 'permanent'        THEN 'PERMANENT'
  WHEN 'sheltered'        THEN 'SHELTERED'
  WHEN 'temporary'        THEN 'TEMPORARY'
  WHEN 'unknown'          THEN 'UNKNOWN'
  WHEN 'declined_consent' THEN 'DECLINED_CONSENT'
END::"DeflectionExitHousingStatusEnum"
WHERE "exitHousingStatusId" IS NOT NULL;

-- Drop old FK columns from Deflection
ALTER TABLE "Deflection" DROP CONSTRAINT IF EXISTS "Deflection_cancelReasonId_fkey";
ALTER TABLE "Deflection" DROP CONSTRAINT IF EXISTS "Deflection_releaseReasonId_fkey";
ALTER TABLE "Deflection" DROP CONSTRAINT IF EXISTS "Deflection_refusalReasonId_fkey";
ALTER TABLE "Deflection" DROP CONSTRAINT IF EXISTS "Deflection_exitDestinationId_fkey";
ALTER TABLE "Deflection" DROP CONSTRAINT IF EXISTS "Deflection_exitHousingStatusId_fkey";
ALTER TABLE "Deflection" DROP COLUMN "cancelReasonId";
ALTER TABLE "Deflection" DROP COLUMN "releaseReasonId";
ALTER TABLE "Deflection" DROP COLUMN "refusalReasonId";
ALTER TABLE "Deflection" DROP COLUMN "exitDestinationId";
ALTER TABLE "Deflection" DROP COLUMN "exitHousingStatusId";

-- Add new enum columns to DeflectionUpdate
ALTER TABLE "DeflectionUpdate" ADD COLUMN "cancelReason" "DeflectionCancelReasonEnum";
ALTER TABLE "DeflectionUpdate" ADD COLUMN "releaseReason" "DeflectionReleaseReasonEnum";
ALTER TABLE "DeflectionUpdate" ADD COLUMN "refusalReason" "DeflectionRefusalReasonEnum";
ALTER TABLE "DeflectionUpdate" ADD COLUMN "exitDestination" "DeflectionExitDestinationEnum";
ALTER TABLE "DeflectionUpdate" ADD COLUMN "exitHousingStatus" "DeflectionExitHousingStatusEnum";

-- Backfill DeflectionUpdate enum columns
UPDATE "DeflectionUpdate" SET "cancelReason" = CASE "cancelReasonId"
  WHEN '5150'                THEN 'BEHAVIORAL_HEALTH_EVALUATION'
  WHEN 'jail'                THEN 'JAIL'
  WHEN 'hospital'            THEN 'HOSPITAL'
  WHEN 'release_on_scene'    THEN 'RELEASE_ON_SCENE'
  WHEN 'no_chairs_available' THEN 'NO_CHAIRS_AVAILABLE'
  WHEN 'staffing_shortage'   THEN 'STAFFING_SHORTAGE'
END::"DeflectionCancelReasonEnum"
WHERE "cancelReasonId" IS NOT NULL;

UPDATE "DeflectionUpdate" SET "releaseReason" = CASE "releaseReasonId"
  WHEN 'sobered'                      THEN 'SOBERED'
  WHEN 'medical_issue'                THEN 'MEDICAL_ISSUE'
  WHEN 'behavioral_health_evaluation' THEN 'BEHAVIORAL_HEALTH_EVALUATION'
  WHEN 'other'                        THEN 'OTHER'
  WHEN 'death_in_facility'            THEN 'DEATH_IN_FACILITY'
  WHEN 'death_in_custody'             THEN 'DEATH_IN_CUSTODY'
END::"DeflectionReleaseReasonEnum"
WHERE "releaseReasonId" IS NOT NULL;

UPDATE "DeflectionUpdate" SET "refusalReason" = CASE "refusalReasonId"
  WHEN 'aggressive_behavior' THEN 'AGGRESSIVE_BEHAVIOR'
  WHEN 'medical_issue'       THEN 'MEDICAL_ISSUE'
END::"DeflectionRefusalReasonEnum"
WHERE "refusalReasonId" IS NOT NULL;

UPDATE "DeflectionUpdate" SET "exitDestination" = CASE "exitDestinationId"
  WHEN 'jail'                 THEN 'JAIL'
  WHEN 'hospital'             THEN 'HOSPITAL'
  WHEN 'street'               THEN 'STREET'
  WHEN 'home'                 THEN 'HOME'
  WHEN 'services_non_hospital' THEN 'SERVICES_NON_HOSPITAL'
  WHEN 'declined_consent'     THEN 'DECLINED_CONSENT'
  WHEN 'other'                THEN 'OTHER'
END::"DeflectionExitDestinationEnum"
WHERE "exitDestinationId" IS NOT NULL;

UPDATE "DeflectionUpdate" SET "exitHousingStatus" = CASE "exitHousingStatusId"
  WHEN 'permanent'        THEN 'PERMANENT'
  WHEN 'sheltered'        THEN 'SHELTERED'
  WHEN 'temporary'        THEN 'TEMPORARY'
  WHEN 'unknown'          THEN 'UNKNOWN'
  WHEN 'declined_consent' THEN 'DECLINED_CONSENT'
END::"DeflectionExitHousingStatusEnum"
WHERE "exitHousingStatusId" IS NOT NULL;

-- Drop old FK columns from DeflectionUpdate
ALTER TABLE "DeflectionUpdate" DROP CONSTRAINT IF EXISTS "DeflectionUpdate_cancelReasonId_fkey";
ALTER TABLE "DeflectionUpdate" DROP CONSTRAINT IF EXISTS "DeflectionUpdate_releaseReasonId_fkey";
ALTER TABLE "DeflectionUpdate" DROP CONSTRAINT IF EXISTS "DeflectionUpdate_refusalReasonId_fkey";
ALTER TABLE "DeflectionUpdate" DROP CONSTRAINT IF EXISTS "DeflectionUpdate_exitDestinationId_fkey";
ALTER TABLE "DeflectionUpdate" DROP CONSTRAINT IF EXISTS "DeflectionUpdate_exitHousingStatusId_fkey";
ALTER TABLE "DeflectionUpdate" DROP COLUMN "cancelReasonId";
ALTER TABLE "DeflectionUpdate" DROP COLUMN "releaseReasonId";
ALTER TABLE "DeflectionUpdate" DROP COLUMN "refusalReasonId";
ALTER TABLE "DeflectionUpdate" DROP COLUMN "exitDestinationId";
ALTER TABLE "DeflectionUpdate" DROP COLUMN "exitHousingStatusId";

-- Drop the 5 deflection lookup tables
DROP TABLE "DeflectionCancelReason";
DROP TABLE "DeflectionReleaseReason";
DROP TABLE "DeflectionRefusalReason";
DROP TABLE "DeflectionExitDestination";
DROP TABLE "DeflectionExitHousingStatus";

-- Add statusReason enum column to Facility
ALTER TABLE "Facility" ADD COLUMN "statusReason" "FacilityStatusReasonEnum";

UPDATE "Facility" SET "statusReason" = CASE "statusReasonId"
  WHEN 'building_issue'       THEN 'BUILDING_ISSUE'
  WHEN 'safety_lockdown'      THEN 'SAFETY_LOCKDOWN'
  WHEN 'other'                THEN 'OTHER'
  WHEN 'sfso_staffing'        THEN 'SFSO_STAFFING'
  WHEN 'connections_staffing' THEN 'CONNECTIONS_STAFFING'
END::"FacilityStatusReasonEnum"
WHERE "statusReasonId" IS NOT NULL;

ALTER TABLE "Facility" DROP CONSTRAINT IF EXISTS "Facility_statusReasonId_fkey";
ALTER TABLE "Facility" DROP COLUMN "statusReasonId";

-- Add statusReason enum column to FacilityUpdate
ALTER TABLE "FacilityUpdate" ADD COLUMN "statusReason" "FacilityStatusReasonEnum";

UPDATE "FacilityUpdate" SET "statusReason" = CASE "statusReasonId"
  WHEN 'building_issue'       THEN 'BUILDING_ISSUE'
  WHEN 'safety_lockdown'      THEN 'SAFETY_LOCKDOWN'
  WHEN 'other'                THEN 'OTHER'
  WHEN 'sfso_staffing'        THEN 'SFSO_STAFFING'
  WHEN 'connections_staffing' THEN 'CONNECTIONS_STAFFING'
END::"FacilityStatusReasonEnum"
WHERE "statusReasonId" IS NOT NULL;

ALTER TABLE "FacilityUpdate" DROP CONSTRAINT IF EXISTS "FacilityUpdate_statusReasonId_fkey";
ALTER TABLE "FacilityUpdate" DROP COLUMN "statusReasonId";

-- Drop FacilityStatusReason table
DROP TABLE "FacilityStatusReason";

-- Add unavailableReason enum column to BedType
ALTER TABLE "BedType" ADD COLUMN "unavailableReason" "BedTypeUnavailableReasonEnum";

UPDATE "BedType" b SET "unavailableReason" = CASE r.description
  WHEN 'Lack of SFSD staffing'       THEN 'SFSD_STAFFING'
  WHEN 'Lack of contractor staffing'  THEN 'CONTRACTOR_STAFFING'
  WHEN 'Building issue'              THEN 'BUILDING_ISSUE'
  WHEN 'Safety lock-down'            THEN 'SAFETY_LOCKDOWN'
  WHEN 'Other (specify)'             THEN 'OTHER'
END::"BedTypeUnavailableReasonEnum"
FROM "BedTypeUnavailableReason" r
WHERE b."unavailableReasonId" = r.id;

ALTER TABLE "BedType" DROP CONSTRAINT IF EXISTS "BedType_unavailableReasonId_fkey";
ALTER TABLE "BedType" DROP COLUMN "unavailableReasonId";

-- Add unavailableReason enum column to BedTypeUpdate
ALTER TABLE "BedTypeUpdate" ADD COLUMN "unavailableReason" "BedTypeUnavailableReasonEnum";

UPDATE "BedTypeUpdate" bu SET "unavailableReason" = CASE r.description
  WHEN 'Lack of SFSD staffing'       THEN 'SFSD_STAFFING'
  WHEN 'Lack of contractor staffing'  THEN 'CONTRACTOR_STAFFING'
  WHEN 'Building issue'              THEN 'BUILDING_ISSUE'
  WHEN 'Safety lock-down'            THEN 'SAFETY_LOCKDOWN'
  WHEN 'Other (specify)'             THEN 'OTHER'
END::"BedTypeUnavailableReasonEnum"
FROM "BedTypeUnavailableReason" r
WHERE bu."unavailableReasonId" = r.id;

ALTER TABLE "BedTypeUpdate" DROP CONSTRAINT IF EXISTS "BedTypeUpdate_unavailableReasonId_fkey";
ALTER TABLE "BedTypeUpdate" DROP COLUMN "unavailableReasonId";

-- Drop BedTypeUnavailableReason table
DROP TABLE "BedTypeUnavailableReason";
