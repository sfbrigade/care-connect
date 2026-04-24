# Deflection State Machine — Implementation Plan

## Problem

State transition logic for deflections is spread across ~10 route handlers, each independently:
- Defining which statuses are valid preconditions (ad-hoc arrays/checks)
- Guarding against invalid transitions (duplicated `if` + `409 CONFLICT` pattern)
- Computing bed type count changes (duplicated `buildBedTypeUpdate` functions in multiple files)
- Creating audit records (`deflectionUpdate`)
- Updating timestamps on the deflection row

There's no single source of truth for "what transitions are legal" or "what does a transition do to bed counts." If someone adds a new status or changes a transition rule, they have to find and update every handler that touches it.

## Goals

1. **Single source of truth** for the deflection subject-status graph — one file that declares every legal transition.
2. **Shared bed-type accounting** — one function that knows which statuses are "hold" vs "occupied" vs "in-transit," replacing the duplicated `buildBedTypeUpdate` helpers.
3. **Reusable transition helper** — a function that handles the repeated boilerplate of: lock bed type → re-fetch deflection → validate status → create audit record → update deflection → update bed counts.
4. **Keep route handlers in control** — they still own request validation, authorization, domain-specific side effects (emails, job queues, hospital cancellation logic), and response formatting. The state machine is a tool they call, not a framework that calls them.

## What's NOT changing

- Route handler files stay where they are. They keep their Fastify schema definitions, auth hooks, and response logic.
- The Prisma schema is untouched — no new models, no new enums.
- The `HoldStatus` (ACTIVE/CANCELLED/EXPIRED/COMPLETED) transitions are NOT included in this state machine. Those are simpler, have fewer rules, and are tightly coupled to specific business logic (cancel has hospital 647f checks, reopen has bed availability checks). Trying to unify them with subject-status transitions would over-abstract.
- No new npm dependencies.

## New files

### 1. `server/lib/deflectionStateMachine.js`

The core module. Contains three things:

#### a) Transition map

```js
import Deflection from '#models/deflection.js';

const S = Deflection.SubjectStatus;

// Every legal subject-status transition.
// Key = current status, value = array of statuses it can move to.
export const SUBJECT_STATUS_TRANSITIONS = {
  [S.DETAINED]:                   [S.ONSITE_AWAITING_TRANSFER],
  [S.ONSITE_AWAITING_TRANSFER]:   [S.AWAITING_INTAKE],
  [S.AWAITING_INTAKE]:            [S.READY_FOR_INTAKE, S.RELEASED, S.EXITED, S.DEATH_IN_CUSTODY],
  [S.READY_FOR_INTAKE]:           [S.ADMITTED, S.RELEASED, S.EXITED, S.DEATH_IN_CUSTODY],
  [S.ADMITTED]:                   [S.IN_CHAIR, S.FAILED_INTAKE, S.RELEASED, S.EXITED, S.DEATH_IN_CUSTODY],
  [S.FAILED_INTAKE]:              [S.RELEASED, S.EXITED, S.DEATH_IN_CUSTODY],
  [S.IN_CHAIR]:                   [S.RELEASED, S.EXITED, S.DEATH_IN_FACILITY, S.DEATH_IN_CUSTODY],
  [S.RELEASED]:                   [S.EXITED, S.DEATH_IN_FACILITY, S.DEATH_IN_CUSTODY],
  // Terminal states — no outbound transitions
  [S.EXITED]:                     [],
  [S.DEATH_IN_FACILITY]:          [],
  [S.DEATH_IN_CUSTODY]:           [],
};
```

Note: `AWAITING_INTAKE`, `READY_FOR_INTAKE`, `ADMITTED`, and `FAILED_INTAKE` can all reach `RELEASED` (via the release handler), `EXITED` (via exit-to-jail), and `DEATH_IN_CUSTODY` (via record-death). This matches the existing route handler guards exactly.

#### b) Bed-type classification

```js
// Statuses where the person holds a bed but doesn't physically occupy it.
export const HOLD_STATUSES = new Set([
  S.DETAINED,
  S.ONSITE_AWAITING_TRANSFER,
  S.AWAITING_INTAKE,
  S.READY_FOR_INTAKE,
  S.ADMITTED,
  S.FAILED_INTAKE,
]);

// Statuses where the person physically occupies a bed.
export const OCCUPIED_STATUSES = new Set([
  S.IN_CHAIR,
  S.RELEASED,
]);

// Statuses where the person is in transit to the facility.
export const IN_TRANSIT_STATUSES = new Set([
  S.DETAINED,
  S.ONSITE_AWAITING_TRANSFER,
]);
```

Plus a shared `computeBedTypeChanges(previousStatus, nextStatus)` function that returns a delta object like `{ holds: -1, occupied: +1 }` instead of the full bed-type snapshot. Each route handler applies the delta to the locked bed-type row. This replaces the duplicated `buildBedTypeUpdate` functions in `release.js`, `record-death.js`, and `exit-to-jail.js`.

#### c) Validation helper

```js
export function canTransition(fromStatus, toStatus) {
  return SUBJECT_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}
```

Returns a boolean. The route handler decides what to do when the transition is invalid — typically `reply.code(409).send()`, but some handlers may want to attempt recovery or return a more specific error.

#### d) Audit record helper

```js
export function buildAuditRecord({ deflectionId, subjectStatus, userId, extra = {} }) {
  return {
    deflectionId,
    subjectStatus,
    updatedById: userId,
    updatedAt: new Date(),
    ...extra,
  };
}
```

### 2. `server/lib/deflectionStateMachine.test.js`

Unit tests for the transition map and bed-type computation:
- Every declared transition is valid
- Invalid transitions are rejected
- `computeBedTypeChanges` returns correct deltas for hold→occupied, hold→released, occupied→exited, etc.
- Edge cases: terminal states have no outbound transitions

## Route handler refactoring

Each handler gets simpler but keeps its structure. Here's the pattern, using `admit.js` as an example:

### Before (admit.js today)
```js
if (deflection.subjectStatus !== Deflection.SubjectStatus.READY_FOR_INTAKE) {
  return reply.code(StatusCodes.CONFLICT).send();
}
// ... manually create audit record, update deflection
```

### After
```js
import { canTransition, buildAuditRecord, computeBedTypeChanges } from '#lib/deflectionStateMachine.js';

// Inside the transaction, after re-fetching:
const nextStatus = Deflection.SubjectStatus.ADMITTED;
if (!canTransition(deflection.subjectStatus, nextStatus)) {
  return reply.code(StatusCodes.CONFLICT).send();
}

await tx.deflectionUpdate.create({
  data: buildAuditRecord({
    deflectionId: id,
    subjectStatus: nextStatus,
    userId: request.user.id,
  }),
});
// ... rest of update logic stays the same
```

The `canTransition` call returns false if the transition is illegal. The route handler still decides how to respond — the state machine doesn't throw or send replies.

### Handler-by-handler changes

| Handler | Current guard | After refactor |
|---|---|---|
| `transfer.js` | `status !== ACTIVE \|\| subjectStatus !== ONSITE_AWAITING_TRANSFER` | `!canTransition(subjectStatus, AWAITING_INTAKE)` + keep the `status !== ACTIVE` check separately (hold-status is not part of this FSM) |
| `safety-check.js` | `subjectStatus !== AWAITING_INTAKE` | `!canTransition(subjectStatus, READY_FOR_INTAKE)` |
| `admit.js` | `subjectStatus !== READY_FOR_INTAKE` | `!canTransition(subjectStatus, ADMITTED)` |
| `intake-complete.js` | `subjectStatus !== ADMITTED` | `!canTransition(subjectStatus, IN_CHAIR)` or `!canTransition(subjectStatus, FAILED_INTAKE)` based on `completed` flag |
| `release.js` | `!RELEASABLE_STATUSES.includes(subjectStatus)` | `!canTransition(subjectStatus, RELEASED)` (works because all 5 releasable statuses list RELEASED as a valid target) |
| `exit.js` | `!EXITABLE_STATUSES.includes(subjectStatus)` | `!canTransition(subjectStatus, EXITED)` |
| `exit-to-jail.js` | `!EXIT_TO_JAIL_ELIGIBLE_STATUSES.has(subjectStatus)` | `!canTransition(subjectStatus, EXITED)` |
| `record-death.js` | `!ELIGIBLE_STATUSES.includes(subjectStatus)` | `!canTransition(subjectStatus, nextDeathStatus)` |
| `cancel.js` | `status === ACTIVE` (hold-status check) | No change — cancel operates on hold-status, not subject-status |
| `reopen.js` | `status !== CANCELLED && status !== EXPIRED` | No change — same reason |

### Bed-type refactoring

The duplicated `buildBedTypeUpdate` functions in `release.js`, `record-death.js`, and `exit-to-jail.js` get replaced with `computeBedTypeChanges` from the state machine module. The handlers still apply the changes within their transactions — the state machine just computes the delta.

`transfer.js` has a unique bed-type change (decrement `inTransit`) that doesn't fit the general pattern. It keeps its inline logic.

`intake-complete.js` has a conditional bed-type change (only on success). It uses `computeBedTypeChanges` for the success path.

`exit.js` has a straightforward occupied→available change. It uses `computeBedTypeChanges`.

## Client-side sharing

The transition map could also be shared with the client to replace the hardcoded status checks in components like `CustodyCard.jsx` and `careDetailFooterUtils.js`. However, this is a separate concern — the server module uses `#models/deflection.js` imports that don't exist on the client. 

A follow-up step could extract just the transition map and status sets into a shared constants file that both sides import. But that's out of scope for this change.

## Migration strategy

This is a pure refactor — no behavior changes. The approach:

1. Add `deflectionStateMachine.js` + tests
2. Refactor one simple handler first (`safety-check.js` — it's the smallest) to validate the pattern
3. Refactor remaining handlers one at a time
4. Remove the now-unused local `buildBedTypeUpdate` functions and status arrays from individual route files
5. Run existing test suite to confirm no regressions

## Phase 0: Validation test harness (build BEFORE any refactor)

Before touching any production code, we build a test suite that validates the current behavior of every state transition endpoint. This serves two purposes:
1. Documents exactly what the code does today (including any bugs or race condition gaps)
2. Gives us a safety net — if any test breaks after the refactor, we know we changed behavior

### What exists today

The existing `server/test/routes/api/deflections.test.js` already covers:
- Create, GET, PATCH, PUT subject
- Transfer (ONSITE_AWAITING_TRANSFER → AWAITING_INTAKE) — happy path + bed counts
- Admit (READY_FOR_INTAKE → ADMITTED) — happy path + bed counts
- Intake-complete (ADMITTED → IN_CHAIR, ADMITTED → FAILED_INTAKE) — both paths
- Exit-to-jail — from AWAITING_INTAKE, READY_FOR_INTAKE, ADMITTED, FAILED_INTAKE, IN_CHAIR + bed counts + property return
- Record-death — from READY_FOR_INTAKE (→ DEATH_IN_CUSTODY), from RELEASED (→ DEATH_IN_FACILITY)
- Cancel — happy path + hospital cancellation + bed counts
- Reopen — happy path + no-beds conflict
- Exit-details — saves without status change
- Property-return — various scenarios

### What's missing

The existing tests mostly cover happy paths. What's NOT tested:

#### 1. Invalid transition rejection (the guards)
Every endpoint should return 409 CONFLICT when called from a wrong status. The existing tests only check a few of these. We need systematic coverage:

```
POST /:id/transfer      from DETAINED              → should 409
POST /:id/transfer      from AWAITING_INTAKE       → should 409
POST /:id/safety-check  from DETAINED              → should 409
POST /:id/safety-check  from READY_FOR_INTAKE      → should 409
POST /:id/admit         from AWAITING_INTAKE       → should 409
POST /:id/admit         from IN_CHAIR              → should 409
POST /:id/intake-complete from IN_CHAIR            → should 409
POST /:id/intake-complete from READY_FOR_INTAKE    → should 409
POST /:id/release       from DETAINED              → should 409
POST /:id/release       from ONSITE_AWAITING_TRANSFER → should 409
POST /:id/release       from EXITED                → should 409
POST /:id/exit          from AWAITING_INTAKE       → should 409
POST /:id/exit          from DETAINED              → should 409
POST /:id/exit-to-jail  from DETAINED              → should 409 (partially tested)
POST /:id/exit-to-jail  from RELEASED              → should 409
POST /:id/record-death  from DETAINED              → should 409 (partially tested)
POST /:id/record-death  from EXITED                → should 409
```

#### 2. Full lifecycle walk-throughs
End-to-end tests that walk a deflection through the entire happy path:

```
Test A: "Normal flow"
  CREATE → DETAINED → ONSITE_AWAITING_TRANSFER (via arrive)
  → AWAITING_INTAKE (transfer) → READY_FOR_INTAKE (safety-check)
  → ADMITTED (admit) → IN_CHAIR (intake-complete completed=true)
  → RELEASED (release) → EXITED (exit)
  Verify: hold status = COMPLETED, bed counts correct at each step

Test B: "Failed intake flow"
  CREATE → ... → ADMITTED → FAILED_INTAKE (intake-complete completed=false)
  → RELEASED (release) → EXITED (exit)

Test C: "Early release flow"
  CREATE → ... → AWAITING_INTAKE → RELEASED (release, skipping intake)
  → EXITED (exit)

Test D: "Death in custody flow"
  CREATE → ... → IN_CHAIR → DEATH_IN_CUSTODY (record-death)
  Verify: hold status = COMPLETED

Test E: "Death in facility flow"
  CREATE → ... → RELEASED → DEATH_IN_FACILITY (record-death)

Test F: "Cancel and reopen flow"
  CREATE → DETAINED → CANCELLED (cancel) → ACTIVE (reopen)
  Verify: bed counts restored

Test G: "Exit to jail from various statuses"
  CREATE → ... → AWAITING_INTAKE → EXITED (exit-to-jail)
  CREATE → ... → IN_CHAIR → EXITED (exit-to-jail)
```

#### 3. Concurrent request tests (race condition detection)
These are the most important for catching the bugs you've seen. Each test fires two requests simultaneously against the same deflection:

```
Test R1: "Double transfer"
  Set deflection to ONSITE_AWAITING_TRANSFER
  Fire 2x POST /:id/transfer concurrently
  Assert: exactly one succeeds (200), one fails (409)
  Assert: bed counts changed exactly once

Test R2: "Double admit"
  Set deflection to READY_FOR_INTAKE
  Fire 2x POST /:id/admit concurrently
  Assert: exactly one succeeds, one fails

Test R3: "Transfer + cancel race"
  Set deflection to ONSITE_AWAITING_TRANSFER
  Fire POST /:id/transfer + DELETE /:id concurrently
  Assert: exactly one succeeds
  Assert: bed counts are consistent (no double-decrement)

Test R4: "Release + exit race"
  Set deflection to IN_CHAIR
  Fire POST /:id/release + POST /:id/exit concurrently
  Assert: exactly one succeeds
  Assert: bed counts are consistent

Test R5: "Admit + cancel race"
  Set deflection to READY_FOR_INTAKE
  Fire POST /:id/admit + DELETE /:id concurrently
  Assert: exactly one succeeds

Test R6: "Double intake-complete"
  Set deflection to ADMITTED
  Fire 2x POST /:id/intake-complete { completed: true } concurrently
  Assert: exactly one succeeds
  Assert: occupied incremented exactly once
```

#### 4. Bed count invariant checks
After every transition test, verify the bed count invariant:
```js
function assertBedCountInvariant(bedType) {
  // Total allocated = unavailable + occupied + holds + available
  const total = bedType.unavailableUnoccupied + bedType.unavailableOccupied
    + bedType.occupied + bedType.holds + bedType.available;
  assert.strictEqual(total, bedType.capacity,
    `Bed count invariant violated: ${total} !== capacity ${bedType.capacity}`);
  // inTransit is a subset of holds
  assert.ok(bedType.inTransit <= bedType.holds,
    `inTransit (${bedType.inTransit}) exceeds holds (${bedType.holds})`);
  // No negative counts
  assert.ok(bedType.occupied >= 0, 'occupied is negative');
  assert.ok(bedType.holds >= 0, 'holds is negative');
  assert.ok(bedType.available >= 0, 'available is negative');
  assert.ok(bedType.inTransit >= 0, 'inTransit is negative');
}
```

### New test file

`server/test/routes/api/deflections-state-transitions.test.js`

This file is purely additive — it doesn't modify or replace any existing tests. It uses the same test infrastructure (`build`, `authenticate`, testcontainers, fixture reset between tests).

Structure:
```
/api/deflections state transitions
  ├── Invalid transition rejection
  │   ├── transfer rejects from wrong statuses
  │   ├── safety-check rejects from wrong statuses
  │   ├── admit rejects from wrong statuses
  │   ├── intake-complete rejects from wrong statuses
  │   ├── release rejects from wrong statuses
  │   ├── exit rejects from wrong statuses
  │   ├── exit-to-jail rejects from wrong statuses
  │   └── record-death rejects from wrong statuses
  ├── Full lifecycle walk-throughs
  │   ├── normal flow: create → ... → exited
  │   ├── failed intake flow
  │   ├── early release flow
  │   ├── death in custody flow
  │   ├── death in facility flow
  │   ├── cancel and reopen flow
  │   └── exit to jail from various statuses
  ├── Concurrent request tests
  │   ├── double transfer
  │   ├── double admit
  │   ├── transfer + cancel race
  │   ├── release + exit race
  │   ├── admit + cancel race
  │   └── double intake-complete
  └── Bed count invariants
      └── (checked after every transition in all above tests)
```

### How the concurrent tests work

The key insight: the existing route handlers already use `SELECT ... FOR UPDATE` via `findByIdForUpdate` to serialize access to the bed type row. The concurrent tests validate that this locking actually works by using `Promise.allSettled`:

```js
const [result1, result2] = await Promise.allSettled([
  app.inject().post(`/api/deflections/${id}/transfer`).headers(custodyHeaders),
  app.inject().post(`/api/deflections/${id}/transfer`).headers(custodyHeaders),
]);

const statuses = [result1, result2].map(r =>
  r.status === 'fulfilled' ? r.value.statusCode : 'rejected'
);
const successes = statuses.filter(s => s === 200);
const conflicts = statuses.filter(s => s === 409);

assert.strictEqual(successes.length, 1, 'exactly one request should succeed');
assert.strictEqual(conflicts.length, 1, 'exactly one request should conflict');
```

If the locking is broken, both requests might succeed, and bed counts will be wrong. The bed count invariant check after each concurrent test catches this.

### What this will reveal

Running this test suite against the current code will tell you:
1. Whether any "invalid" transitions are actually allowed (guards missing or wrong)
2. Whether the row-level locking is actually preventing race conditions
3. Whether bed counts stay consistent under concurrent load
4. Whether there are any status combinations that leave deflections in unreachable states

If any concurrent tests fail, that's your race condition evidence — and it tells you exactly which endpoint pair is vulnerable.

## Decisions

1. **Error handling style**: `canTransition` returns a boolean so the route handler can decide how to respond (or attempt recovery). No thrown errors.

2. **Bed-type unification**: The functions are identical — they should be unified. See analysis below.

3. **Client-side sharing**: Deferred to a follow-up. See analysis below.

4. **Test priority**: Build the full test harness (Phase 0) first, before any refactoring.

---

## Appendix A: `buildBedTypeUpdate` comparison

There are 7 handlers that modify bed counts. Here's every one, side by side:

### `release.js` — `buildBedTypeUpdate` (extracted function)
```
if previousStatus in [DETAINED, ONSITE_AWAITING_TRANSFER, AWAITING_INTAKE, FAILED_INTAKE, READY_FOR_INTAKE, ADMITTED]:
    holds -= 1
if previousStatus in [IN_CHAIR, RELEASED]:
    occupied -= 1
available += 1
```

### `record-death.js` — `buildBedTypeUpdate` (extracted function)
```
if previousStatus in [DETAINED, ONSITE_AWAITING_TRANSFER, AWAITING_INTAKE, FAILED_INTAKE, READY_FOR_INTAKE, ADMITTED]:
    holds -= 1
if previousStatus in [IN_CHAIR, RELEASED]:
    occupied -= 1
available += 1
```

**Verdict: `release.js` and `record-death.js` are IDENTICAL.** Exact same function, copy-pasted.

### `exit-to-jail.js` — inline logic
```
if previousStatus in [DETAINED, ONSITE_AWAITING_TRANSFER, AWAITING_INTAKE, READY_FOR_INTAKE, ADMITTED, FAILED_INTAKE]:
    holds -= 1
else:
    occupied -= 1
available += 1
```

**Verdict: IDENTICAL logic to the above two.** The status lists are the same sets (just different order). The `else` branch is equivalent to `if previousStatus in [IN_CHAIR]` because exit-to-jail only allows `AWAITING_INTAKE, READY_FOR_INTAKE, ADMITTED, FAILED_INTAKE, IN_CHAIR` — and the first branch catches all except IN_CHAIR. So the `else` always means IN_CHAIR, which is the same as `isOccupiedRelease` in the other two (minus RELEASED, which exit-to-jail doesn't allow anyway).

### `exit.js` — inline logic
```
occupied -= 1
available += 1
```

**Verdict: SIMPLER but consistent.** Exit only allows `IN_CHAIR` and `RELEASED` — both are occupied statuses. So it hardcodes `occupied -= 1` instead of checking. This is correct but could use the shared function (it would hit the `isOccupiedRelease` branch).

### `cancel.js` — inline logic
```
holds -= 1
if subjectStatus in [DETAINED, ONSITE_AWAITING_TRANSFER]:
    inTransit -= 1
available += 1
```

**Verdict: DIFFERENT.** Cancel always decrements holds (because you can only cancel ACTIVE holds, which are always in a hold status). It also decrements inTransit for the two pre-arrival statuses. The other functions don't touch inTransit.

### `transfer.js` — inline logic
```
inTransit -= 1
(holds, occupied, available unchanged)
```

**Verdict: UNIQUE.** Transfer only changes inTransit. Both ONSITE_AWAITING_TRANSFER and AWAITING_INTAKE are hold statuses, so holds/occupied/available don't change.

### `intake-complete.js` — inline logic (only when completed=true)
```
occupied += 1
holds -= 1
(available unchanged)
```

**Verdict: UNIQUE.** This is the hold→occupied promotion. Only happens on ADMITTED → IN_CHAIR.

### Summary

| Handler | holds | occupied | available | inTransit | Same as others? |
|---|---|---|---|---|---|
| `release.js` | -1 if hold status | -1 if occupied status | +1 | — | ✅ identical to record-death, exit-to-jail |
| `record-death.js` | -1 if hold status | -1 if occupied status | +1 | — | ✅ identical to release, exit-to-jail |
| `exit-to-jail.js` | -1 if hold status | -1 if occupied status | +1 | — | ✅ identical to release, record-death |
| `exit.js` | — | -1 | +1 | — | Simplified version of above (always occupied) |
| `cancel.js` | -1 | — | +1 | -1 if in-transit | Different (always hold, touches inTransit) |
| `transfer.js` | — | — | — | -1 | Unique (only inTransit) |
| `intake-complete.js` | -1 | +1 | — | — | Unique (hold→occupied promotion) |

**Recommendation**: Unify `release.js`, `record-death.js`, `exit-to-jail.js`, and `exit.js` into one shared function. `cancel.js`, `transfer.js`, and `intake-complete.js` have unique enough logic to keep inline (or get their own small helpers).

---

## Appendix B: Client-side transition map usage

Today the client hardcodes status checks to decide which UI elements to show:

```js
// CustodyCard.jsx
const showMarkComplete = deflection.subjectStatus === 'AWAITING_INTAKE';
const showLegalRelease = deflection.subjectStatus === 'FAILED_INTAKE';
const showStartRelease = deflection.subjectStatus === 'IN_CHAIR';
const showQrCode = deflection.subjectStatus === 'READY_FOR_INTAKE';

// careDetailFooterUtils.js
if (deflection?.subjectStatus === 'ADMITTED') → show "Update intake status"
if (deflection?.subjectStatus === 'RELEASED') → show "Start exit" / "Finish exit"
```

With a shared transition map, these could become:

```js
import { canTransition } from '@shared/deflectionTransitions';

// "Can this deflection be released?" replaces checking 5 individual statuses
const showLegalRelease = canTransition(deflection.subjectStatus, 'RELEASED');

// "Can this deflection be admitted?" replaces checking for READY_FOR_INTAKE
const showAdmit = canTransition(deflection.subjectStatus, 'ADMITTED');
```

The benefit: if a new status is added or a transition rule changes, you update the map in one place and both server and client pick it up.

The challenge: the server module uses `#models/deflection.js` (a server-only import). To share, we'd need to extract the pure transition map into a package or shared directory that both `server/` and `client/` can import. Options:
- A `shared/` directory at the repo root with its own package.json, imported by both
- A plain JS file with string constants (no Prisma dependency) that both sides copy or symlink

This is a real improvement but it's a structural change to the repo. Recommend doing it as a follow-up after the state machine and tests are solid on the server side.
