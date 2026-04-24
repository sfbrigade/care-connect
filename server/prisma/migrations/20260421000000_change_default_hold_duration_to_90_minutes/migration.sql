ALTER TABLE "public"."Deflection" ALTER COLUMN "expiresAt" SET DEFAULT (now() + '01:30:00'::interval);
