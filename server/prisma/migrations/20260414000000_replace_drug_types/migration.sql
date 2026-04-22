-- Replace clinical drug type names with street-level names.
-- All existing values are set to NULL (no lossy mapping).

-- Create the new enum
CREATE TYPE "DrugTypeEnum_new" AS ENUM ('ALCOHOL', 'HEROIN', 'FENTANYL', 'COCAINE', 'METH', 'MEDS', 'OTHER');

-- Nullify existing values and switch to new enum
ALTER TABLE "Deflection" ALTER COLUMN "drugType" DROP DEFAULT;
ALTER TABLE "Deflection" ALTER COLUMN "drugType" TYPE "DrugTypeEnum_new" USING NULL;

-- Drop old enum and rename
DROP TYPE "DrugTypeEnum";
ALTER TYPE "DrugTypeEnum_new" RENAME TO "DrugTypeEnum";
