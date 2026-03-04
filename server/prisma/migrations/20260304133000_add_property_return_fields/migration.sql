ALTER TABLE "Deflection"
  ADD COLUMN "propertyReturned" BOOLEAN,
  ADD COLUMN "propertyReturnReason" TEXT,
  ADD COLUMN "propertyReturnOtherReason" TEXT,
  ADD COLUMN "propertyReturnedAt" TIMESTAMP(3),
  ADD COLUMN "propertyReturnedById" UUID;

ALTER TABLE "DeflectionUpdate"
  ADD COLUMN "propertyReturned" BOOLEAN,
  ADD COLUMN "propertyReturnReason" TEXT,
  ADD COLUMN "propertyReturnOtherReason" TEXT;

ALTER TABLE "Deflection"
  ADD CONSTRAINT "Deflection_propertyReturnedById_fkey"
  FOREIGN KEY ("propertyReturnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
