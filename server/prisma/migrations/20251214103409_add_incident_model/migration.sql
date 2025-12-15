-- CreateTable
CREATE TABLE "public"."Incident" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cadNumber" TEXT NOT NULL,
    "locationArrested" TEXT,
    "dateTimeArrested" TIMESTAMP(3) NOT NULL,
    "charge" TEXT NOT NULL DEFAULT '647(f) RWS',
    "unit" TEXT,
    "badgeNumber" TEXT,
    "agency" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_cadNumber_idx" ON "public"."Incident"("cadNumber");

-- CreateIndex
CREATE INDEX "Incident_createdById_idx" ON "public"."Incident"("createdById");

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "public"."BedHold" ADD COLUMN "incidentId" UUID;

-- CreateIndex
CREATE INDEX "BedHold_incidentId_idx" ON "public"."BedHold"("incidentId");

-- AddForeignKey
ALTER TABLE "public"."BedHold" ADD CONSTRAINT "BedHold_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

