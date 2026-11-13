-- CreateEnum
CREATE TYPE "public"."DeflectionExitTransportationEnum" AS ENUM ('SELF_TRANSPORT', 'OUTREACH_TRANSPORT_TEAM', 'TRANSIT_MUNI', 'TRANSIT_BART', 'TRANSIT_OTHER', 'FRIEND_FAMILY_TRANSPORT', 'COMMUNITY_FORWARD_VAN', 'TAXI_UBER_LYFT');

-- AlterTable
ALTER TABLE "public"."Deflection" ADD COLUMN     "exitTransportation" "public"."DeflectionExitTransportationEnum";

-- AlterTable
ALTER TABLE "public"."DeflectionUpdate" ADD COLUMN     "exitTransportation" "public"."DeflectionExitTransportationEnum";
