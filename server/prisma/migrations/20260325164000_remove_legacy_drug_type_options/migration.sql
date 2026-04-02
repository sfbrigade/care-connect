CREATE TYPE "public"."DrugTypeEnum_new" AS ENUM (
  'CNS_DEPRESSANTS',
  'CNS_STIMULANTS',
  'HALLUCINOGENS',
  'DISSOCIATIVE_ANESTHETICS',
  'NARCOTIC_ANALGESICS',
  'INHALANTS',
  'CANNABIS'
);

ALTER TABLE "public"."Deflection"
ALTER COLUMN "drugType" TYPE "public"."DrugTypeEnum_new"
USING (
  CASE
    WHEN "drugType"::text = 'INTOXICATING_LIQUOR' THEN 'CNS_DEPRESSANTS'
    WHEN "drugType"::text = 'TOLUENE' THEN 'INHALANTS'
    WHEN "drugType"::text IN ('DRUG', 'COMBINATION') THEN NULL
    ELSE "drugType"::text
  END
)::"public"."DrugTypeEnum_new";

DROP TYPE "public"."DrugTypeEnum";

ALTER TYPE "public"."DrugTypeEnum_new" RENAME TO "DrugTypeEnum";
