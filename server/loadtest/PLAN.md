# Load Test Expansion Plan

## Goal

Expand the Node-based load/concurrency harness so it covers the main race-condition surfaces in the Care Connect server:

- Deflection state transitions
- Facility status changes
- Bed/chair count updates
- Incident lifecycle operations
- Duplicate-submit/idempotency behavior

The harness must continue to run against a live local server, seed its own isolated load-test facility state, and exit non-zero when invariants drift.

## Scope

### Existing scenarios to retain

1. `create-bed-race`
2. `cancel-deflection-race`
3. `incident-create-race`

### New scenario groups to implement

#### A. Deflection transition races

1. `safety-check-vs-admit`
2. `admit-vs-intake-complete`
3. `release-vs-exit`
4. `release-vs-exit-to-jail`
5. `release-vs-record-death`
6. `exit-vs-record-death`
7. `exit-to-jail-vs-record-death`
8. `cancel-vs-reopen`
9. `transfer-vs-cancel`
10. `transfer-vs-facility-close`

#### B. Facility admin races

11. `facility-close-vs-deflection-create`
12. `facility-close-vs-incident-create`
13. `facility-close-vs-facility-reopen`
14. `facility-close-vs-reopen`

#### C. Bed type / chair count races

15. `bed-type-shrink-vs-deflection-create`
16. `bed-type-shrink-vs-incident-create`
17. `bed-type-shrink-vs-reopen`
18. `bed-type-update-vs-facility-close`
19. `bed-type-update-vs-bed-type-update`

#### D. Mixed terminal-state matrix

20. `awaiting-intake-terminal-race`
21. `ready-for-intake-terminal-race`
22. `admitted-terminal-race`
23. `in-chair-terminal-race`
24. `released-terminal-race`

These matrix scenarios run multiple mutually exclusive terminal transitions against a single deflection seeded in a known starting state:

- `AWAITING_INTAKE`: safety-check, release, exit-to-jail, record-death
- `READY_FOR_INTAKE`: admit, release, exit-to-jail, record-death
- `ADMITTED`: intake-complete(true), intake-complete(false), medical release, exit-to-jail, record-death
- `IN_CHAIR`: exit, release, record-death
- `RELEASED`: exit, record-death

#### E. Incident races

25. `incident-cancel-vs-deflection-create`
26. `incident-cancel-vs-transfer`
27. `incident-left-vs-deflection-cancel`
28. `incident-arrived-vs-transfer`

#### F. Duplicate-submit / idempotency scenarios

29. `duplicate-release`
30. `duplicate-exit`
31. `duplicate-facility-close`
32. `duplicate-bed-type-update`

## Implementation approach

### 1. Refactor the harness

Add reusable helpers for:

- loading user sessions by role
- creating test incidents/deflections in specific subject states
- seeding bed counts for hold vs occupied states
- issuing concurrent mixed requests
- asserting final deflection, incident, facility, and bed invariants
- counting update records for idempotency assertions

### 2. Add canonical fixtures

The harness should build its own per-run objects under the isolated load-test facility:

- field-owned incidents
- custody/care-accessible deflections
- helper subjects and optional property photos
- reusable payload factories for:
  - release
  - exit
  - exit-to-jail
  - record-death
  - intake-complete
  - facility status update
  - bed type update

### 3. Assertion model

Each scenario should assert:

- response status distribution is within expected set
- final state is one of the allowed terminal states
- only the winning transition’s update records were created
- bed counts reconcile with final deflection state
- no negative counters
- incident completion flags are coherent with active deflections

Special assertions:

- `incident-create-race`: no orphan incidents when hold creation fails
- duplicate-submit scenarios: at most one effective state change
- admin scenarios: no holds remain active when a close operation is supposed to cancel them

### 4. Documentation

Update `server/README.md` so it lists all scenario names by category and gives example commands for:

- a single scenario
- all scenarios
- high-contention runs with more VUs / iterations

## Seeded IDs and payload conventions

Use seeded static IDs where required:

- Facility close reason: `other`
- Exit destination IDs: `jail`, `hospital`, `home`
- Exit housing status ID: `permanent`
- Release reason IDs: `sobered`, `medical_issue`, `other`

Use seeded users:

- Admin: `admin@careconnectsf.org`
- Facility admin / care: `care@careconnectsf.org`
- Custody: `sfso@careconnectsf.org`
- Field: `sfpd@careconnectsf.org`, `sfpd2@careconnectsf.org`

## Order of work

1. Refactor harness foundations
2. Add deflection transition races
3. Add facility and bed-type races
4. Add incident races
5. Add duplicate-submit scenarios
6. Update README and scripts
7. Validate `npm run loadtest:list`

## Definition of done

- All scenario names above appear in `npm run loadtest:list`
- Each scenario creates and cleans up its own data safely under the isolated load-test facility
- The harness exits non-zero on invariant drift
- README explains how to run by category
