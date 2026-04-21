INSERT INTO "DeflectionCancelReason" (
  "id",
  "name",
  "createdById",
  "updatedById"
)
SELECT
  'no_chairs_available',
  'No chairs available',
  "User"."id",
  "User"."id"
FROM "User"
ORDER BY ("User"."email" = 'admin@careconnectsf.org') DESC, "User"."createdAt" ASC
LIMIT 1
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;
