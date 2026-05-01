# ADMITTED to IN_MEDICAL_INTAKE Rename Plan

## Goal

Rename the `SubjectStatusEnum` value `ADMITTED` to `IN_MEDICAL_INTAKE`, and rename the related timestamp/user fields from `admitted*` to `beginMedicalIntake*`, without changing workflow behavior.

This is a hard rename everywhere. No temporary support is needed for legacy `ADMITTED` or `admitted*` names.

## Recommended approach

Do this as one coordinated application change with explicit sequencing:

1. Prepare the schema and migration plan.
2. Update server runtime code and API contracts.
3. Update client code to consume the renamed status and fields.
4. Update seeds, tests, stories, and any generated/reference docs.
5. Run focused verification before merge.

I do not recommend changing only the enum first and leaving field renames for later. The current frontend and tests are tightly coupled to both the status string and the `admitted*` field names, so a partial rename would create contract mismatches.

## Scope confirmed in repo

### 1. Database and Prisma schema

Status rename:

- `server/prisma/schema.prisma`
- migration SQL for `SubjectStatusEnum`

Field/relation rename:

- `Deflection.admittedAt` -> `beginMedicalIntakeAt`
- `Deflection.admittedById` -> `beginMedicalIntakeById`
- `Deflection.admittedBy` -> `beginMedicalIntakeBy`
- `User.deflectionsAdmitted` -> `deflectionsMedicalIntakeStarted`
- relation name `"AdmittedBy"` -> `"BeginMedicalIntakeBy"`

Notes:

- The DB migration should rename the enum value in place, not recreate the enum.
- The DB migration should rename the `Deflection` columns in place with `ALTER TABLE ... RENAME COLUMN ...`.
- Prisma relation names are application/schema concerns; DB foreign key constraint names can optionally be renamed for cleanliness, but that is not required for correctness.
- `server/prisma/migrations/20260122013614_create_deflection/migration.sql` is historical and should not be edited; add a new migration instead.

### 2. Server runtime and API contract

The initial list caught the main route handlers, but the server contract surface is larger:

- `server/routes/api/deflections/admit.js`
- `server/routes/api/deflections/intake-complete.js`
- `server/routes/api/deflections/release.js`
- `server/routes/api/deflections/exit-to-jail.js`
- `server/routes/api/deflections/record-death.js`
- `server/models/deflection.js`
- `server/routes/api/status/capacity.js`
- `server/lib/hospitalCancellation647f.js`

Required server changes:

- Replace all `Deflection.SubjectStatus.ADMITTED` references with `Deflection.SubjectStatus.IN_MEDICAL_INTAKE`.
- Update route descriptions, conflict messages, and inline comments that currently say `ADMITTED`.
- In `admit.js`, write the new status and renamed fields:
  - `subjectStatus: IN_MEDICAL_INTAKE`
  - `beginMedicalIntakeAt`
  - `beginMedicalIntakeById`
- In `intake-complete.js`, require current status `IN_MEDICAL_INTAKE` and update comments/messages accordingly.
- In release/exit/death logic, replace `ADMITTED` anywhere it participates in eligibility or hold accounting.
- Update `server/models/deflection.js` so the serialized response schema exposes the renamed fields instead of `admittedAt`, `admittedById`, and `admittedBy`.
- Update `server/routes/api/status/capacity.js` as part of the same hard contract rename.

Decision for `/api/status/capacity`:

- Treat it as part of the contract rename and change the payload to `beginMedicalIntakeAt`.
- Do not return both old and new field names during rollout.

### 3. Client runtime

The frontend impact is wider than `Care.jsx`, `CareCard.jsx`, and `Custody.jsx`.

Confirmed runtime references:

- `client/src/lesc/components/care/Care.jsx`
- `client/src/lesc/components/care/CareCard.jsx`
- `client/src/lesc/components/custody/Custody.jsx`
- `client/src/lesc/components/custody/CustodyDetailContent.jsx`
- `client/src/lesc/components/custody/careDetailFooterUtils.js`
- `client/src/lesc/components/custody/careStatusChipUtils.js`
- `client/src/lesc/components/custody/custodyStatusChipUtils.js`
- `client/src/lesc/components/deflectionStatusChipUtils.js`
- `client/src/lesc/components/Deflection.jsx`
- `client/src/lesc/components/holdsViewModel.js`
- `client/src/utils/releaseTiming.js`

Required client changes:

- Replace runtime status checks for `'ADMITTED'` with `'IN_MEDICAL_INTAKE'`.
- Update status filter query strings sent to the API.
- Update status-accordion/grouping keys so cards still render under the correct section.
- Rename client reads of `admittedAt`/`admittedById` if the server contract changes those names.
- Update comments/tooltips that still describe the state as “admitted” rather than “medical intake started/in progress” where needed for clarity.

Important detail:

- `client/src/utils/releaseTiming.js` and `client/src/lesc/components/holdsViewModel.js` currently rely on `admittedAt`. These helpers must move with the renamed field at the same time as the API/schema change so the UI does not fail silently.

### 4. Seeds, fixtures, tests, stories, and docs

Confirmed non-runtime references:

- `server/prisma/seeds/testDeflections.js`
- `server/prisma/seeds/historicalData.js`
- `server/test/routes/api/deflections.test.js`
- `server/test/routes/api/status-capacity.test.js`
- `client/src/utils/releaseTiming.test.js`
- `client/src/lesc/components/care/Care.test.jsx`
- `client/src/lesc/components/care/CareCard.test.jsx`
- `client/src/lesc/components/care/careFlow.test.js`
- `client/src/lesc/components/custody/Custody.test.jsx`
- `client/src/lesc/components/custody/CustodyCard.test.jsx`
- `client/src/lesc/components/custody/CustodyDetailContent.test.js`
- `client/src/lesc/components/custody/careStatusChipUtils.test.js`
- `client/src/lesc/components/custody/custodyStatusChipUtils.test.js`
- stories under `client/src/lesc/components/**`
- `server/prisma/ERD.md`
- `docs/SYNTHETIC_DATA_GUIDELINES.md`
- `e2e/accessibility-audit-deep.spec.js`

Required updates:

- Replace fixture statuses from `ADMITTED` to `IN_MEDICAL_INTAKE`.
- Rename fixture/test object fields from `admittedAt`/`admittedById` to the new field names where the API/schema changes.
- Update test expectations for route responses and query filters.
- Update stories so local visual/dev tooling still renders.

Recommendation:

- Treat docs and ERD updates as part of the same PR if feasible, because this rename changes business terminology.
- If PR size becomes a concern, runtime/tests first and docs second is acceptable, but stories should stay with the runtime change.

## Suggested implementation sequence

### Phase 1. Schema and migration design

1. Add a new Prisma migration that:
   - renames enum value `ADMITTED` to `IN_MEDICAL_INTAKE`
   - renames `Deflection.admittedAt` to `beginMedicalIntakeAt`
   - renames `Deflection.admittedById` to `beginMedicalIntakeById`
2. Update `schema.prisma` to match:
   - enum value
   - renamed fields
   - renamed relation field(s) and relation name(s)
3. Regenerate Prisma client.

### Phase 2. Server contract changes

1. Update server route logic and shared server libraries.
2. Update `server/models/deflection.js` response schema.
3. Update `server/routes/api/status/capacity.js`.
4. Update capacity output to the renamed field with no compatibility alias.

### Phase 3. Client updates

1. Update care/custody list filters and section keys.
2. Update status-chip helpers and detail/footer logic.
3. Update helper utilities that read intake-start timing fields.

### Phase 4. Test and fixture updates

1. Update server tests first, because they define the API contract.
2. Update client unit/component tests.
3. Update seeds/stories/e2e/docs.

## Risks and decisions already resolved

### Contract compatibility

Confirmed decisions:

- This is a hard rename everywhere.
- No temporary support is needed for legacy `ADMITTED` or `admitted*` names.
- `/api/status/capacity` should rename its payload field with no compatibility alias.

### Naming consistency

Accepted names:

- `beginMedicalIntakeAt`
- `beginMedicalIntakeById`
- `beginMedicalIntakeBy`
- `deflectionsMedicalIntakeStarted`
- relation name `"BeginMedicalIntakeBy"`

Avoid mixing `beginMedicalIntake*` fields with legacy relation names like `"AdmittedBy"`.

### Search completeness

The initial analysis undercounted references. Implementation should use a final repo-wide search for:

- `ADMITTED`
- `admittedAt`
- `admittedById`
- `admittedBy`
- `AdmittedBy`

## Verification checklist

After implementation, verify at minimum:

1. Prisma migration applies cleanly to an existing database.
2. Admit flow writes `IN_MEDICAL_INTAKE` and `beginMedicalIntake*`.
3. Intake-complete succeeds only from `IN_MEDICAL_INTAKE`.
4. Release, exit-to-jail, and death flows still accept the renamed intermediate status.
5. Care and Custody pages still render the “In Medical Intake” section correctly.
6. `releaseTiming.js` and `holdsViewModel.js` use the renamed intake-start field and continue to behave correctly.
7. Status-capacity output matches the renamed final contract.

## Recommended plan summary

Proceed with one coordinated rename across:

- DB enum value
- DB columns
- Prisma schema and relation names
- server runtime logic
- server response schemas
- client runtime references
- tests, seeds, stories, and docs

The main revision to the original analysis is that `server/models/deflection.js`, `server/routes/api/status/capacity.js`, several shared client helpers, and a wider set of tests/stories/docs must be included. This should now be implemented as a hard rename everywhere, including the accepted relation renames and the capacity endpoint contract.
