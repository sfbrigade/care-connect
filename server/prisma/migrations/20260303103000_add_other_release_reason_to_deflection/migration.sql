ALTER TABLE "public"."Deflection"
ADD COLUMN "otherReleaseReason" TEXT;

ALTER TABLE "public"."DeflectionUpdate"
ADD COLUMN "otherReleaseReason" TEXT;
