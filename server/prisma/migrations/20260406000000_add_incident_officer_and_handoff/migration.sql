-- CreateEnum
CREATE TYPE "IncidentOfficerRoleEnum" AS ENUM ('ARRESTING', 'RECEIVING');

-- AlterTable: Add currentOfficerId to Deflection
ALTER TABLE "public"."Deflection" ADD COLUMN "currentOfficerId" UUID;

-- Backfill currentOfficerId with createdById
UPDATE "public"."Deflection" SET "currentOfficerId" = "createdById" WHERE "currentOfficerId" IS NULL;

-- AddForeignKey
ALTER TABLE "public"."Deflection" ADD CONSTRAINT "Deflection_currentOfficerId_fkey" FOREIGN KEY ("currentOfficerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."IncidentOfficer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incidentId" INTEGER NOT NULL,
    "facilityId" UUID NOT NULL,
    "officerId" UUID NOT NULL,
    "role" "IncidentOfficerRoleEnum" NOT NULL,
    "arrivedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "handoffReceivedAt" TIMESTAMP(3),
    "handoffReceivedFromId" UUID,
    "badgeNumber" TEXT,
    "organizationId" TEXT,
    "unitId" TEXT,
    "titleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentOfficer_incidentId_facilityId_officerId_key" ON "public"."IncidentOfficer"("incidentId", "facilityId", "officerId");

-- AddForeignKey
ALTER TABLE "public"."IncidentOfficer" ADD CONSTRAINT "IncidentOfficer_facilityId_incidentId_fkey" FOREIGN KEY ("facilityId", "incidentId") REFERENCES "public"."Incident"("facilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentOfficer" ADD CONSTRAINT "IncidentOfficer_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentOfficer" ADD CONSTRAINT "IncidentOfficer_handoffReceivedFromId_fkey" FOREIGN KEY ("handoffReceivedFromId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentOfficer" ADD CONSTRAINT "IncidentOfficer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentOfficer" ADD CONSTRAINT "IncidentOfficer_organizationId_unitId_fkey" FOREIGN KEY ("organizationId", "unitId") REFERENCES "public"."Unit"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentOfficer" ADD CONSTRAINT "IncidentOfficer_organizationId_titleId_fkey" FOREIGN KEY ("organizationId", "titleId") REFERENCES "public"."Title"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill IncidentOfficer records for existing incidents
INSERT INTO "public"."IncidentOfficer" ("id", "incidentId", "facilityId", "officerId", "role", "arrivedAt", "leftAt", "badgeNumber", "organizationId", "unitId", "titleId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    i."id",
    i."facilityId",
    i."createdById",
    'ARRESTING'::"IncidentOfficerRoleEnum",
    i."arrivedAt",
    i."leftAt",
    i."createdByBadgeNumber",
    i."createdByOrganizationId",
    i."createdByUnitId",
    i."createdByTitleId",
    NOW(),
    NOW()
FROM "public"."Incident" i
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."IncidentOfficer" io
    WHERE io."incidentId" = i."id" AND io."facilityId" = i."facilityId" AND io."officerId" = i."createdById"
);
