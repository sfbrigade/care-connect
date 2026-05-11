# AGENTS.md

## Concurrency and Transactions

This codebase has several hot paths where concurrent requests mutate the same `Deflection`, `BedType`, `Facility`, and incident-related rows. Future changes must preserve commit-time correctness, not just transactional atomicity.

### Core Rules

1. Do not rely on stale pre-transaction reads for write eligibility.
   - Unsafe pattern: read a row, decide it is eligible, then later update it inside a transaction by `id` only.
   - Safe pattern: enter the transaction, acquire the relevant lock or use a conditional update, re-read current state, then validate and write.

2. Transaction callbacks must only do one of two things:
   - return plain data on success
   - throw on logical failure so the transaction rolls back
   - Never call `reply.send()`, `reply.code(...).send()`, or otherwise write the HTTP response from inside `fastify.prisma.$transaction(...)`.

3. Audit/event rows must be derived from rows actually updated at commit time.
   - Do not create `DeflectionUpdate`, `BedTypeUpdate`, `FacilityCheckIn`, or similar side effects from a stale snapshot.
   - If using `updateMany`, only emit side effects for rows whose conditional update actually matched.

4. Bed/facility counters must only be decremented once per hold.
   - When concurrent admin workflows can cancel the same hold, conditionalize the cancel/update on current active state and only adjust counters if the row transition actually happened.
   - Clamp counters like `holds` and `inTransit` with `Math.max(0, ...)` where double-decrement risk exists.

### Locking Guidance

Choose the narrowest lock that protects the invariant:

- `Deflection` lock:
  - use for single-deflection state transitions like `admit`, `handoff`, `property-return`, `subject` upsert, reopen validation, or similar “only one winner” transitions
  - helper: `fastify.prisma.deflection.findByIdForUpdate(tx, id)`

- `BedType` lock:
  - use when bed availability or bed counters may change, or when multiple transitions serialize through shared bed capacity
  - helper: `fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId)`

- `Facility` lock:
  - use when facility status, arrival/departure presence, or facility-wide hold cancellation must coordinate with hold creation or hold-state changes
  - helper: `fastify.prisma.facility.findByIdForUpdate(tx, facilityId)`

### Lock Ordering

When a route must touch more than one resource type, keep lock order consistent:

1. `Facility`
2. `BedType`
3. `Deflection`

If you introduce a path that needs multiple locks, compare it against existing handlers first. Inconsistent lock ordering has already caused deadlocks in this codebase.

### Prefer Conditional Updates Over Broad Row Locks for Batch Presence Flows

For facility presence flows like `arrived` and `left`, explicit locking of multiple deflections can deadlock against other transitions.

Preferred pattern:

1. lock the `Facility`
2. snapshot candidate deflection ids and key state under that lock
3. for each candidate, use `updateMany` with exact state predicates (`id`, `status`, `subjectStatus`, `currentOfficerId`, `arrivedAt`, etc.)
4. only treat rows with `count === 1` as successfully transitioned

This preserves commit-time correctness without introducing a batch `FOR UPDATE` deadlock.

### Transition Handler Checklist

Before merging any route that changes deflection/facility/bed state, verify all of the following:

- eligibility is checked inside the transaction from locked or conditionally matched current state
- losing concurrent requests fail with `409`/`400`/`410` and do not partially persist rows
- audit rows are not duplicated under concurrency
- `Incident`, `Deflection`, `IncidentOfficer`, `BedType`, and `FacilityCheckIn` side effects stay reconciled
- counters (`holds`, `inTransit`, `occupied`, `available`) still match persisted active deflections after concurrent operations settle

### Tests to Add for New State Transitions

For any new state-changing endpoint, add at least:

1. happy-path state transition test
2. invalid-state rejection test
3. concurrency regression covering the most likely competing transition
4. final-state assertion proving only one winner or that counters reconcile correctly

Typical concurrent pairs in this codebase:

- create vs close
- reopen vs close
- shrink vs close
- arrived vs cancel/transfer
- left vs cancel/transfer
- single-deflection transition vs same transition again
- subject/property/audit mutation vs duplicate submission

### Existing Guardrail

There is already a test guard preventing `reply.*` inside Prisma transaction callbacks:

- `care-connect/server/test/no-reply-in-transaction.test.js`

Do not weaken or bypass it. If a route needs transactional failure handling, throw a domain error and construct the HTTP response after the transaction exits.
