INSERT INTO "DeflectionCancelReason" (
  "id",
  "name",
  "createdById",
  "updatedById",
  "updatedAt"
)
SELECT
  'no_chairs_available',
  'No chairs available',
  "User"."id",
  "User"."id",
  CURRENT_TIMESTAMP
FROM "User"
ORDER BY ("User"."email" = 'admin@careconnectsf.org') DESC, "User"."createdAt" ASC
LIMIT 1
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;
