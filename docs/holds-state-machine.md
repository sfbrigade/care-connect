# Holds state machine

Reference for the deflection lifecycle, the `BedType` counters, and the chair-state UI. Read this before adding a new lifecycle transition, a new counter, or a new view that summarizes capacity.

## Conservation invariant

For every `BedType`, this must hold at all times:

```
capacity = unavailableUnoccupied + unavailableOccupied + occupied + holds + available
```

Every chair sits in exactly one of those five buckets. If you're adding a transition or a counter, your job is to keep this true under every code path.

The chair-availability card displays *online capacity*:

```
online = capacity - unavailableUnoccupied - unavailableOccupied
       = occupied + holds + available
```

So the card's three numbers (`available`, `held`, `occupied`) sum to online capacity.

`inTransit` is **not** part of this partition — it's a tracking counter that overlaps `holds` (specifically, the DETAINED-status subset). See "Surprises" below.

## State → bucket mapping

| `subjectStatus`                         | hold status         | Bucket    | Counter(s)               |
| --------------------------------------- | ------------------- | --------- | ------------------------ |
| `DETAINED`                              | `ACTIVE`            | Held      | `holds`, `inTransit`     |
| `ONSITE_AWAITING_TRANSFER`              | `ACTIVE`            | Held      | `holds`                  |
| `AWAITING_INTAKE`                       | `ACTIVE`            | Held      | `holds`                  |
| `READY_FOR_INTAKE`                      | `ACTIVE`            | Held      | `holds`                  |
| `FAILED_INTAKE`                         | `ACTIVE`            | Held      | `holds`                  |
| `IN_MEDICAL_INTAKE`                     | `ACTIVE`            | Held      | `holds`                  |
| `IN_CHAIR`                              | `ACTIVE`            | Occupied  | `occupied`               |
| `RELEASED`                              | `ACTIVE`            | Occupied  | `occupied` (path-dependent — see Surprises) |
| `EXITED`                                | `COMPLETED`         | —         | freed → `available`      |
| `DEATH_IN_FACILITY` / `DEATH_IN_CUSTODY`| `COMPLETED`         | —         | freed → `available`      |
| (any)                                   | `CANCELLED` / `EXPIRED` | —     | freed → `available`      |

Plus the offline buckets (admin-controlled, see "Counter mutations" below):

| Chair condition              | Bucket   | Counter                |
| ---------------------------- | -------- | ---------------------- |
| Chair offline, empty         | Offline  | `unavailableUnoccupied`|
| Chair offline, person inside | Offline  | `unavailableOccupied`  |

## Surprises

Two facts that are easy to miss and have caused bugs.

**1. `inTransit` ⊂ `holds`, not a peer counter.**
A new `DETAINED` hold increments **both** `holds` and `inTransit`. The arrival transition (`DETAINED → ONSITE_AWAITING_TRANSFER`) decrements only `inTransit`; the chair stays in `holds` until intake completes. So:

- To answer "how many chairs are reserved (any pre-chair state)?", read `holds`.
- To answer "how many people are physically traveling?", read `inTransit`.

If you display both, label them carefully — they overlap.

**2. `RELEASED` is path-dependent.**
The same `subjectStatus` can mean different things depending on how it was reached:

- *Sobered from a pre-chair hold* (`DETAINED`, `AWAITING_INTAKE`, etc.) → finalizes immediately as `EXITED`. Chair is freed. No lingering `RELEASED` row exists.
- *Sobered from `IN_CHAIR`* → lingers as `ACTIVE` / `RELEASED`. Chair is still `occupied` until a separate exit transition.
- *Medical / behavioral-health / "other" release* → finalizes immediately as `EXITED` regardless of starting state.

So a row with `subjectStatus = RELEASED` is always still in a chair (counted as `occupied`); a row with `subjectStatus = EXITED` is always freed. Don't infer chair state from `subjectStatus` alone — read the counters.

## Tabs vs. chair-state — orthogonal axes

The Custody page surfaces two partitions of the same data, on different axes:

- **Chair-state** (in `ChairAvailabilityCard`): partitions chairs into Available / Held / Occupied. Conserves to online capacity. Answers *can I accept another?*
- **People-state** (in the Custody page tabs): partitions active deflections into Transit / Custody / Released. Answers *who needs my attention?*

The tab partition does **not** align with the chair partition. The tabs are defined as:

```
Transit  → subjectStatus ∈ { DETAINED, ONSITE_AWAITING_TRANSFER }
Custody  → subjectStatus ∈ { AWAITING_INTAKE, FAILED_INTAKE, READY_FOR_INTAKE, IN_MEDICAL_INTAKE, IN_CHAIR }
Released → subjectStatus ∈ { RELEASED, EXITED }
```

So:

- *Transit tab* is a strict subset of *Held*.
- *Custody tab* spans *Held* (pre-chair statuses) and *Occupied* (`IN_CHAIR`).
- *Released tab* spans *Occupied* (`RELEASED`-still-in-chair) and freed-from-counters (`EXITED`).

This is intentional. If you find yourself trying to make one display answer both questions, separate them.

## Where the counter mutations live

Counters are stored on `BedType` (see `server/prisma/schema.prisma`) and mutated transactionally by the lifecycle routes in `server/routes/api/deflections/`. To find the counter change for any transition, read the route that performs it.

Quick index:

| File                                                                            | Transition                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `deflections/create.js`, `incidents/create.js`                                  | New hold: `holds++`, `inTransit++`, `available--`                     |
| `deflections/cancel.js`                                                         | Cancel: `holds--` (and `inTransit--` if was `DETAINED`), `available++`|
| `deflections/reopen.js`                                                         | Reopen cancelled/expired: inverse of cancel                           |
| `facilities/_facilityId/arrived.js`                                             | `DETAINED → ONSITE_AWAITING_TRANSFER`: `inTransit--` only             |
| `deflections/transfer.js`, `admit.js`, `safety-check.js`                        | Within-`holds` transitions: no counter change                         |
| `deflections/intake-complete.js` (success)                                      | `IN_MEDICAL_INTAKE → IN_CHAIR`: `holds--`, `occupied++`               |
| `deflections/release.js`                                                        | Release: depends on previous state (see Surprises)                    |
| `deflections/exit.js`, `exit-to-jail.js`                                        | Exit: `occupied--`, `available++`                                     |
| `deflections/record-death.js`                                                   | Death: frees the chair, decrements whichever counter held it          |
| `facilities/_facilityId/bed-types/update.js`                                    | Admin capacity change. May auto-cancel in-transit holds to balance.   |

**Admin override.** `server/routes/api/facilities/_facilityId/bed-types/{create,update}.js` accept the counters directly via `BedType.UpdateSchema`, gated by `requireFacilityAdmin`. This is the only path that can move chairs into `unavailableOccupied`; no normal lifecycle route writes to it.

## Maintenance

Treat this doc as part of the contract. If you add or change a state, transition, or counter, update the relevant section. The conservation invariant is the load-bearing claim — if a future change breaks it, fix the change, not the doc.
