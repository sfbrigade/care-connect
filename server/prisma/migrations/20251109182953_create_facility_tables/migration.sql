-- CreateEnum
CREATE TYPE "public"."PlacementRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."FacilityUpdateMethod" AS ENUM ('INTEGRATION', 'API', 'MANUAL', 'AUTOMATED_CALL', 'AUTOMATED_TEXT', 'WHITEBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FacilityEligibilityType" AS ENUM ('AGE', 'GENDER', 'AMBULATORY', 'MOBILITY_DEVICES', 'ADL_INDEPENDENT', 'HOUSING_STATUS', 'NEIGHBORHOOD', 'SEXUAL_ORIENTATION', 'RACE', 'LANGUAGE', 'PETS', 'BELONGINGS', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Facility" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updateMethod" "public"."FacilityUpdateMethod" NOT NULL DEFAULT 'MANUAL',
    "updateNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Amenity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityAmenity" (
    "facilityId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,

    CONSTRAINT "FacilityAmenity_pkey" PRIMARY KEY ("facilityId","amenityId")
);

-- CreateTable
CREATE TABLE "public"."ServiceType" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityService" (
    "facilityId" UUID NOT NULL,
    "serviceTypeId" UUID NOT NULL,
    "availableBeds" INTEGER NOT NULL DEFAULT 0,
    "reservedBeds" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "FacilityService_pkey" PRIMARY KEY ("facilityId","serviceTypeId")
);

-- CreateTable
CREATE TABLE "public"."FacilityEligibility" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "type" "public"."FacilityEligibilityType" NOT NULL,
    "value" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityCapacitySnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facilityId" UUID NOT NULL,
    "totalBeds" INTEGER,
    "availableBeds" INTEGER,
    "reservedBeds" INTEGER,
    "lastSyncSource" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityCapacitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "description" TEXT,
    "pets" TEXT,
    "qualifications" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlacementRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referenceCode" TEXT,
    "facilityId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "reviewedById" UUID,
    "serviceTypeId" UUID,
    "status" "public"."PlacementRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "outreachNotes" TEXT,
    "providerNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlacementRequestEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "placementRequestId" UUID NOT NULL,
    "status" "public"."PlacementRequestStatus" NOT NULL,
    "notes" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "public"."Amenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_code_key" ON "public"."ServiceType"("code");

-- CreateIndex
CREATE INDEX "FacilityEligibility_facilityId_type_idx" ON "public"."FacilityEligibility"("facilityId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementRequest_referenceCode_key" ON "public"."PlacementRequest"("referenceCode");

-- CreateIndex
CREATE INDEX "PlacementRequestEvent_placementRequestId_createdAt_idx" ON "public"."PlacementRequestEvent"("placementRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."FacilityContact" ADD CONSTRAINT "FacilityContact_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityAmenity" ADD CONSTRAINT "FacilityAmenity_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityAmenity" ADD CONSTRAINT "FacilityAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "public"."Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityService" ADD CONSTRAINT "FacilityService_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityService" ADD CONSTRAINT "FacilityService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityEligibility" ADD CONSTRAINT "FacilityEligibility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityCapacitySnapshot" ADD CONSTRAINT "FacilityCapacitySnapshot_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequest" ADD CONSTRAINT "PlacementRequest_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequest" ADD CONSTRAINT "PlacementRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequest" ADD CONSTRAINT "PlacementRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequest" ADD CONSTRAINT "PlacementRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequest" ADD CONSTRAINT "PlacementRequest_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequestEvent" ADD CONSTRAINT "PlacementRequestEvent_placementRequestId_fkey" FOREIGN KEY ("placementRequestId") REFERENCES "public"."PlacementRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRequestEvent" ADD CONSTRAINT "PlacementRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
