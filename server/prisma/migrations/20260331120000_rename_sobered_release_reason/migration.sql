DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."DeflectionReleaseReason"
    WHERE "id" = 'sobered'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM "public"."DeflectionReleaseReason"
      WHERE "id" = 'can_care_for_themselves'
    ) THEN
      UPDATE "public"."Deflection"
      SET "releaseReasonId" = 'can_care_for_themselves'
      WHERE "releaseReasonId" = 'sobered';

      UPDATE "public"."DeflectionUpdate"
      SET "releaseReasonId" = 'can_care_for_themselves'
      WHERE "releaseReasonId" = 'sobered';

      DELETE FROM "public"."DeflectionReleaseReason"
      WHERE "id" = 'sobered';
    ELSE
      UPDATE "public"."DeflectionReleaseReason"
      SET
        "id" = 'can_care_for_themselves',
        "name" = 'Can care for themselves'
      WHERE "id" = 'sobered';
    END IF;
  END IF;

  UPDATE "public"."DeflectionReleaseReason"
  SET "name" = 'Can care for themselves'
  WHERE "id" = 'can_care_for_themselves';
END $$;
