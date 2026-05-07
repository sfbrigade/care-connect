UPDATE "public"."Unit"
SET "name" = UPPER(TRIM("name"))
WHERE "name" IS DISTINCT FROM UPPER(TRIM("name"));
