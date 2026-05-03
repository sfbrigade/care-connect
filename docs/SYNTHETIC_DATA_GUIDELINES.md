# Synthetic Data Guidelines for Care Connect

This document captures the business rules, state machines, and constraints for generating realistic synthetic data to test the Care Connect system and downstream analytics.

---

## Overview

Care Connect tracks people through sobering center and drop-in facility workflows. The core entities are:

- **Incident** — A field encounter (e.g., a detox/welfare check). One incident can have multiple deflections.
- **Deflection** (aka "Hold") — A reservation/hold placed for one person at one facility bed.
- **IncidentOfficer** — Per-officer participation record for an incident, including arresting vs receiving role, arrival/leave times, and handoff metadata.
- **Subject** — The person associated with a deflection (optional; only created when subject details are entered).
- **Facility** — A LESC (Law Enforcement Sobering Center) or DIDO (Drop-In, Drop-Off) facility.
- **BedType** — A specific bed category within a facility (type: `BED` or `CHAIR`).

---

## Facility Rules

### Facility Types
- `LESC` — Law Enforcement Sobering Center
- `DIDO` — Drop-In, Drop-Off center

### Facility Status
```
CLOSED              → No operations possible
OPEN_NOT_ACCEPTING  → Facility open but not taking new holds
OPEN_ACCEPTING      → Normal operation; accepts new deflections
```

**Rules:**
- Deflections can only be created when facility status = `OPEN_ACCEPTING`
- Facility status changes are audit-logged in `FacilityUpdate`

### Bed Type Capacity Fields
Each `BedType` tracks these counters (all integers ≥ 0):

| Field | Meaning |
|-------|---------|
| `capacity` | Total beds of this type |
| `available` | Beds available for new holds |
| `holds` | Holds placed but not yet intake-complete |
| `inTransit` | Subset of holds where subject is in transit (not yet transferred to custody) |
| `occupied` | Beds occupied by admitted/post-intake subjects |
| `unavailableOccupied` | Beds marked unavailable but currently occupied |
| `unavailableUnoccupied` | Beds marked unavailable and empty |

**Invariant:** `capacity = available + holds + occupied + unavailableOccupied + unavailableUnoccupied`

**Capacity changes by operation:**

| Operation | holds | inTransit | occupied | available |
|-----------|-------|-----------|----------|-----------|
| Create deflection | +1 | +1 | — | -1 |
| Transfer to custody | — | -1 | — | — |
| Intake complete (admitted) | -1 | — | +1 | — |
| Release/Exit from `IN_CHAIR` | — | — | -1 | +1 |
| Release/Exit from hold states | -1 | — | — | +1 |
| Cancel (from `DETAINED`/`ONSITE_AWAITING_TRANSFER`) | -1 | -1 | — | +1 |
| Cancel (from `AWAITING_INTAKE` or later hold states) | -1 | — | — | +1 |
| Cancel (from `IN_CHAIR`) | — | — | -1 | +1 |
| Death | same as corresponding release/exit |

---

## Incident Rules

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | Auto-increment |
| `facilityId` | UUID | The associated facility |
| `arrivedAt` | DateTime? | When responder arrived at facility; null until arrival |
| `leftAt` | DateTime? | When person left the location |
| `completedAt` | DateTime? | Set when incident is fully closed |
| `addressLine1/2`, `city`, `state`, `postalCode` | String? | Location of incident |
| `latitude`, `longitude` | Decimal? | GPS coordinates |
| `arrestedAt` | DateTime? | Time of arrest, if applicable |
| `encounteredVia` | Enum | `ON_VIEW` or `DISPATCHED` |
| `cadNumber` | String? | Computer-aided dispatch number |
| `caseNumber` | String? | Case/report number |
| `supervisorBadgeNumber` | String? | Supervising officer's badge |
| `createdBy` | User FK | Officer who created the incident |
| `createdByOrganization/Title/Unit/BadgeNumber` | String | Snapshotted at creation |
| `incidentOfficers[]` | Relation | Per-officer records; source of current arrival/leave/handoff tracking |

### Incident Officer Tracking

Each incident now has one or more `IncidentOfficer` rows:

| Field | Type | Notes |
|-------|------|-------|
| `incidentId`, `facilityId`, `officerId` | FK set | Unique per incident/facility/officer |
| `role` | Enum | `ARRESTING` or `RECEIVING` |
| `arrivedAt` | DateTime? | Officer-specific arrival time |
| `leftAt` | DateTime? | Officer-specific leave time |
| `handoffReceivedAt` | DateTime? | When this officer accepted a handoff |
| `handoffReceivedFromId` | User FK? | Officer who handed off control |
| `badgeNumber`, `organizationId`, `unitId`, `titleId` | Snapshot fields | Copied from the officer profile at create/handoff |

### Incident Lifecycle (legacy top-level timestamps + current per-officer state)

```
[Created]
    ↓  (arrivedAt = null, completedAt = null)
[Active / In-Progress]
    ↓  PATCH /arrived → arrivedAt set
[Arrived at Facility]
    ↓  completedAt set (auto or explicit cancel)
[Completed]
```

**State determination logic:**
- `arrivedAt == null && completedAt == null` → Active, not yet at facility
- `arrivedAt != null && completedAt == null` → Active, at facility
- `completedAt != null` → Completed/closed

### Incident Business Rules

1. An incident can have one or more deflections.
2. **Incident cancel**: The current `DELETE /incidents/:id` route allows cancellation of any active incident by the creator, an admin, or a full-handoff recipient who controls all remaining active holds.
3. **Cancel with subject details**: If any deflection has a `subjectId`, a cancel reason is required.
4. **Auto-completion**: Incident auto-completes when all pre-transfer deflections are cancelled/expired AND legacy `incident.arrivedAt == null`.
5. **Arrived**: `PATCH /incidents/:id/arrived` updates the requesting officer's `IncidentOfficer.arrivedAt` and only that officer's active deflections move `DETAINED → ONSITE_AWAITING_TRANSFER`.
6. **Legacy incident arrival field**: `incident.arrivedAt` is only set when the creator marks arrived; downstream logic still uses it for some completion checks.
7. **Leave**: `PATCH /incidents/:id/left` updates the requesting officer's `IncidentOfficer.leftAt`; `incident.completedAt` is set once no active holds remain.
8. **Handoff-aware ownership**: Active deflections are controlled by `deflection.currentOfficerId`, not necessarily `incident.createdById`.
9. Incidents are created with an optional first deflection.

### Realistic Timing Patterns

- `arrivedAt` typically 5–30 minutes after incident creation
- `leftAt` typically 10–60 minutes after `arrivedAt`
- Completed incidents have `completedAt` set to the last deflection's exit/completion time
- `arrestedAt` (if present) is typically at or before incident creation time

---

## Deflection (Hold) Rules

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | Auto-increment |
| `incidentId` | Int | Parent incident |
| `facilityId` | UUID | Facility for this hold |
| `bedTypeId` | UUID | Which bed type is reserved |
| `subjectId` | UUID? | Subject record (nullable; added when details entered) |
| `status` | HoldStatusEnum | `ACTIVE`, `CANCELLED`, `EXPIRED`, `COMPLETED` |
| `subjectStatus` | SubjectStatusEnum | Person's current state (see below) |
| `expiresAt` | DateTime | Default: 1 hour after creation |
| `extensionCount` | Int | Number of times hold was extended (default 0) |
| `currentOfficerId` | UUID? | FIELD officer who currently controls the hold |

### Hold Status Values

```
ACTIVE      → Hold is open and in progress
CANCELLED   → Cancelled by a user
EXPIRED     → Automatically expired (expiresAt passed without completion)
COMPLETED   → Person has exited/been released (terminal state)
```

Note: the enum still includes `COMPLETED`, but the current API routes primarily represent finished journeys via terminal `subjectStatus` values (`EXITED`, `DEATH_IN_FACILITY`, `DEATH_IN_CUSTODY`) while `status` often remains `ACTIVE`. Synthetic data should match persisted code behavior, not the older conceptual model.

### Subject Status Values (Person's journey through the facility)

```
DETAINED                   (1) Initial state; person detained in field
ONSITE_AWAITING_TRANSFER   (2) At facility; waiting for custody transfer
AWAITING_INTAKE            (3) Transferred to custody; waiting for intake
READY_FOR_INTAKE           (4) Passed safety check; ready for medical intake
FAILED_INTAKE              (5) Did not pass intake; still in hold
IN_MEDICAL_INTAKE                   (6) Admitted to facility (assessment complete)
IN_CHAIR                   (7) Occupying bed/chair (intake workflow complete)
RELEASED                   (8) Legally released (pending exit processing)
EXITED                     (9) Left the facility — terminal state
DEATH_IN_FACILITY          (10) Died while in facility care — terminal state
DEATH_IN_CUSTODY           (11) Died while in custody — terminal state
```

### Subject Status State Machine

```
DETAINED
  └─ [/handoff] ─────────────────────────────────────→ DETAINED with new `currentOfficerId`
  └─ (controlling officer marks arrived) ───────→ ONSITE_AWAITING_TRANSFER
                                                         │
                                                  [/transfer]
                                                         ↓
                                                  AWAITING_INTAKE
                                                         │
                                                  [/safety-check]
                                                         ↓
                                                  READY_FOR_INTAKE
                                                         │
                                                    [/admit]
                                                         ↓
                                                     IN_MEDICAL_INTAKE
                                                         │
                                              [/intake-complete]
                                            ┌────────────┴────────────┐
                                     completed=true             completed=false
                                            ↓                        ↓
                                         IN_CHAIR              FAILED_INTAKE
                                            │                        │
                                      [/release]               [/release]
                                            ↓                        ↓
                                        RELEASED ◄─────────────────-┘
                                            │
                                        [/exit]
                                            ↓
                                         EXITED

Direct Exit Paths (bypass release):
  AWAITING_INTAKE, READY_FOR_INTAKE, IN_MEDICAL_INTAKE, FAILED_INTAKE
    └─ [/exit-to-jail] ────────────────────────────────────→ EXITED without release

Release Short-Circuit (auto-exit on certain release reasons):
  [/release] with reason = "medical_issue" or "other" ────→ RELEASED and EXITED immediately
  [/release] with reason = "sobered" ─────────────────────→ RELEASED (then needs /exit)

Death Paths (from any in-custody or released state):
  AWAITING_INTAKE, READY_FOR_INTAKE, IN_MEDICAL_INTAKE, FAILED_INTAKE, IN_CHAIR
    └─ [/record-death] ────────────────────────────────────→ DEATH_IN_CUSTODY
  RELEASED
    └─ [/record-death] ────────────────────────────────────→ DEATH_IN_FACILITY

Cancellation (from ACTIVE hold, any subject status):
  ACTIVE hold ──────────────────────────────────────────→ status = CANCELLED

Auto-expiration (job only expires DETAINED holds whose expiresAt passed):
  ACTIVE + DETAINED ────────────────────────────────────→ status = EXPIRED
  (nightly job: expireHolds.js)

Reopen (only from CANCELLED or EXPIRED):
  CANCELLED/EXPIRED ─────────────────────────────────────→ ACTIVE
```

### Hold Status Groupings (used in business logic)

```javascript
// Subjects physically in custody (count toward capacity holds)
IN_CUSTODY_STATUSES = [
  AWAITING_INTAKE, FAILED_INTAKE, READY_FOR_INTAKE, IN_MEDICAL_INTAKE, IN_CHAIR
]

// Subjects eligible for legal release
RELEASABLE_STATUSES = [
  AWAITING_INTAKE, READY_FOR_INTAKE, IN_MEDICAL_INTAKE, IN_CHAIR, FAILED_INTAKE
]

// Terminal subject statuses (deflection is done)
TERMINAL_STATUSES = [EXITED, DEATH_IN_FACILITY, DEATH_IN_CUSTODY]
```

---

## Deflection Detail Fields (by operation)

### Creation
Required:
- `incidentId`, `facilityId`, `bedTypeId`

Optional:
- `subjectId` (or inline subject details)
- `narcoticsSubstance` (Boolean)
- `narcoticsParaphernalia` (Boolean)
- `drugUseEvidence` (Boolean)
- `drugType`: `CNS_DEPRESSANTS`, `CNS_STIMULANTS`, `HALLUCINOGENS`, `DISSOCIATIVE_ANESTHETICS`, `NARCOTIC_ANALGESICS`, `INHALANTS`, `CANNABIS`
- `behavior` (String)
- `behaviorAdditions` (String)
- `property`: `NONE`, `SMALL`, `MEDIUM`, `LARGE`
- `propertyDetails` (String)
- `deflectionDetails` (array of detail IDs)

### Transfer (`/transfer`)
Role required: `CUSTODY`

No request body is currently required.

Persisted by the current route:
- `transferredAt`
- `transferredById`

Additional transfer-related columns exist on the model (`transferredByBadgeNumber`, `transferredByProp115Certified`, `transferredByOrganizationId`, `transferredByUnitId`, `transferredByTitleId`), but the current API route does not require or populate them.

### Officer Handoff (`/handoff`)
Role required: `FIELD`

Effects:
- Reassigns `currentOfficerId` to the receiving officer
- Creates or updates an `IncidentOfficer` row for the receiving officer with:
  - `role = RECEIVING`
  - `handoffReceivedAt`
  - `handoffReceivedFromId`

Constraints:
- Hold must exist and be `ACTIVE`
- Receiving officer cannot already control the hold
- Incident details must be complete before handoff:
  - `addressLine1`, `city`, `state`
  - `arrestedAt`, `encounteredVia`
  - `cadNumber`, `caseNumber`, `supervisorBadgeNumber`
- Receiving officer cannot already have a different active incident at the same facility
- Capacity counters do not change

### Safety Check (`/safety-check`)
No additional required fields (transitions `AWAITING_INTAKE → READY_FOR_INTAKE`).

### Admit (`/admit`)
Role required: `CARE`
No additional required fields (transitions `READY_FOR_INTAKE → IN_MEDICAL_INTAKE`).

### Intake Complete (`/intake-complete`)
- `completed` (Boolean): `true` → `IN_CHAIR`, `false` → `FAILED_INTAKE`

### Release (`/release`)
Role required: `CUSTODY`
Required:
- `releaseReasonId` (FK to `DeflectionReleaseReason`)

Conditional:
- If reason = `medical_issue`: `exitDestinationId` required
- If reason = `other`: `otherReleaseReason` + `otherReleaseDestination` required

Effects:
- `sobered` → `RELEASED`
- `medical_issue` → immediately records `RELEASED` and `EXITED`
- `other` → immediately records `RELEASED` and `EXITED`

### Exit (`/exit`)
Required (from `IN_CHAIR` or `RELEASED`):
- `exitDestinationId` (FK to `DeflectionExitDestination`)
- `exitHousingStatusId` (FK to `DeflectionExitHousingStatus`)
- `exitConnectedToCare`: `YES`, `NO`, or `UNKNOWN`
- `exitSFResident`: `YES`, `NO`, `UNKNOWN`, or `DECLINED_CONSENT`

Note: `DECLINED_CONSENT` is stored distinctly in the database for SF residency.

### Exit to Jail (`/exit-to-jail`)
Role required: `CUSTODY`

No request body is currently required.

Effects:
- Sets `subjectStatus = EXITED`
- Sets `exitDestinationId = jail`
- Derives `refusalReasonId = medical_issue` internally via destination mapping

Note: there is no dedicated `/exit-to-hospital` route in the current API. Hospital exits happen via `/release` with `releaseReasonId = medical_issue` and `exitDestinationId = hospital`.

### Record Death (`/record-death`)
- No additional fields beyond identifying the deflection

### Property Return (`/property-return`)
Required:
- `propertyReturned` (Boolean)

Conditional:
- If `propertyReturned = false`: `propertyNotReturnedReason` required (`ABANDONED`, `DESTROYED`, `OTHER`)
- If reason = `OTHER`: `propertyNotReturnedOtherReason` required

Constraints:
- Subject status must be `RELEASED`
- Can only be recorded once
- Deflection must have property (volume ≠ `NONE`, or description, or photos)

---

## User Roles

Operational roles for workflow transitions:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `FIELD` | Street outreach / field officers | Create incidents/holds, handoff holds, extend their pre-transfer holds, mark arrived/left |
| `CUSTODY` | Custody/detention staff | Transfer, safety-check, release, exit-to-jail, property return, record death |
| `CARE` | Medical/care staff | Admit, intake-complete, save exit details, final exit |

Administrative roles also exist in code (`ORG_ADMIN`, `FACILITY_ADMIN`), but they are not the primary workflow actors for synthetic scenario generation.

---

## Subject (Person) Fields

| Field | Type | Notes |
|-------|------|-------|
| `firstName`, `lastName` | String? | Full name |
| `dateOfBirth` | Date? | DOB |
| `sex` | Enum? | `MALE`, `FEMALE`, `OTHER`, `UNKNOWN` |
| `race` | Enum? | `WHITE`, `BLACK`, `HISPANIC`, `ASIAN`, `OTHER`, `UNKNOWN` |
| `dlNumber`, `dlState` | String? | Driver's license |
| `addressLine1/2`, `city`, `state`, `postalCode` | String? | Home address |

Subjects can be created standalone or inline during deflection creation.

---

## Synthetic Data Generation Guidelines

### Realistic Scenario Flows

#### Scenario A: Full Successful Admission (most common happy path)
```
1. Create incident (encounteredVia: ON_VIEW or DISPATCHED)
2. Create deflection (facility OPEN_ACCEPTING, bedType with available > 0)
   → subjectStatus: DETAINED, holdStatus: ACTIVE, currentOfficerId = creator
3. PATCH incident /arrived (5–30 min after creation)
   → subjectStatus: ONSITE_AWAITING_TRANSFER
4. POST deflection /transfer (5–30 min after arrived)
   → subjectStatus: AWAITING_INTAKE, inTransit decrements
5. POST deflection /safety-check (5–20 min after transfer)
   → subjectStatus: READY_FOR_INTAKE
6. POST deflection /admit (5–30 min after safety-check)
   → subjectStatus: IN_MEDICAL_INTAKE
7. POST deflection /intake-complete with completed=true (15–60 min after admit)
   → subjectStatus: IN_CHAIR, holds-1, occupied+1
8. POST deflection /release with reason="sobered" (1–6 hours after intake-complete)
   → subjectStatus: RELEASED
9. POST deflection /exit (15–60 min after release)
   → subjectStatus: EXITED, occupied-1, available+1
   → hold status typically remains ACTIVE in the current codebase
```

#### Scenario B: Cancelled / No Capacity Scenario
```
1. Create incident
2. Create deflection → subjectStatus: DETAINED, holdStatus: ACTIVE
3. DELETE deflection (cancel with reason)
   → holdStatus: CANCELLED, holds-1, available+1
4. If no remaining active pre-transfer deflections and incident.arrivedAt==null → incident auto-completes
```

#### Scenario C: Expired Hold
```
1. Create incident + deflection
2. No further actions taken within 1 hour
3. Nightly job expires the hold only if it is still `DETAINED` → holdStatus: EXPIRED
4. Optionally: reopen hold → holdStatus: ACTIVE again
```

#### Scenario D: Direct Hospital Exit
```
1–5. Same as Scenario A steps 1–5 (up to READY_FOR_INTAKE)
6. POST deflection /release with releaseReasonId="medical_issue" and exitDestinationId="hospital"
   → subjectStatus: EXITED, holds-1, available+1
   → hold status typically remains ACTIVE in the current codebase
```

#### Scenario E: Failed Intake
```
1–6. Same as Scenario A steps 1–6 (up to IN_MEDICAL_INTAKE)
7. POST deflection /intake-complete with completed=false
   → subjectStatus: FAILED_INTAKE
8. POST deflection /release (with appropriate reason)
   → subjectStatus: RELEASED or EXITED
```

#### Scenario F: Death in Custody
```
1–7. Same as Scenario A steps 1–7 (up to IN_CHAIR)
8. POST deflection /record-death
   → subjectStatus: DEATH_IN_CUSTODY
   → hold status typically remains ACTIVE in the current codebase
```

#### Scenario G: Originating Officer Hands Off Hold, Receiving Officer Completes Happy Path
```
1. Officer A creates incident and first deflection
   → deflection.currentOfficerId = Officer A
   → create IncidentOfficer(role=ARRESTING) for Officer A
2. Officer A completes required incident details needed for handoff:
   → addressLine1, city, state
   → arrestedAt, encounteredVia
   → cadNumber, caseNumber, supervisorBadgeNumber
3. Officer B has no other active incident at the same facility
4. Officer B POSTs deflection /handoff using Officer A's QR/manual code
   → deflection.currentOfficerId = Officer B
   → create/update IncidentOfficer(role=RECEIVING, handoffReceivedAt, handoffReceivedFromId=Officer A)
5. Officer B PATCHes incident /arrived
   → only Officer B's active holds move to ONSITE_AWAITING_TRANSFER
   → Officer B's IncidentOfficer.arrivedAt is set
6. POST deflection /transfer
   → subjectStatus: AWAITING_INTAKE
7. POST deflection /safety-check
   → subjectStatus: READY_FOR_INTAKE
8. POST deflection /admit
   → subjectStatus: IN_MEDICAL_INTAKE
9. POST deflection /intake-complete with completed=true
   → subjectStatus: IN_CHAIR, holds-1, occupied+1
10. POST deflection /release with reason="sobered"
    → subjectStatus: RELEASED
11. POST deflection /exit
    → subjectStatus: EXITED, occupied-1, available+1
12. Officer B PATCHes incident /left after all active holds are resolved
    → Officer B's IncidentOfficer.leftAt is set
    → incident.completedAt is set when no active holds remain
```

---

### Field Value Distributions (suggested for realistic data)

#### `encounteredVia`
- `ON_VIEW`: ~60%
- `DISPATCHED`: ~40%

#### `drugType` (when drug use evidence present)
- `CNS_DEPRESSANTS` (alcohol/benzodiazepines): ~40%
- `CNS_STIMULANTS` (meth/cocaine): ~30%
- `NARCOTIC_ANALGESICS` (opioids): ~20%
- Others: ~10% combined

#### `property`
- `NONE`: ~40%
- `SMALL`: ~35%
- `MEDIUM`: ~20%
- `LARGE`: ~5%

#### `exitConnectedToCare` / `exitSFResident`
- Distribute `YES`/`NO`/`UNKNOWN` realistically (e.g., 30%/50%/20%)

#### Subject Status Terminal Distribution
- `EXITED`: ~80% of completed holds
- `DEATH_IN_CUSTODY`/`DEATH_IN_FACILITY`: ~1% (rare)
- `CANCELLED`: ~10–15% of all holds
- `EXPIRED`: ~5–10% of all holds

---

### Temporal Constraints

All timestamps must be chronologically consistent:

```
incidentCreatedAt
  < arrivedAt (if set)
  < deflectionTransferredAt (if set)
  < safetyCheckAt (if set)
  < medicalIntakeStartedAt (if set)
  < intakeCompletedAt (if set)
  < releasedAt (if set)
  < exitedAt (if set)

deflectionCreatedAt
  < deflectionExpiresAt (= createdAt + 1 hour, unless extended)

handoffReceivedAt (if set)
  >= deflectionCreatedAt
  <= officerArrivedAt (if the receiving officer later arrives)

arrestedAt (if set) ≤ incidentCreatedAt
```

### Typical Duration Ranges

| Phase | Typical Duration |
|-------|-----------------|
| Creation → Arrived | 5–30 minutes |
| Arrived → Transfer | 5–30 minutes |
| Transfer → Safety Check | 5–20 minutes |
| Safety Check → Admit | 5–30 minutes |
| Admit → Intake Complete | 15–60 minutes |
| Intake Complete → Release | 1–8 hours |
| Release → Exit | 15–60 minutes |
| Total hold duration | 2–12 hours |

---

### Referential Integrity Rules

1. Every `deflection.incidentId` must reference a valid `incident.id`
2. Every `deflection.facilityId` must reference a valid `facility.id` with status `OPEN_ACCEPTING` at time of creation
3. Every `deflection.bedTypeId` must reference a `bedType` belonging to `deflection.facilityId` with `available > 0` at time of creation
4. If `deflection.subjectId` is set, it must reference a valid `subject.id`
5. Cancel/release/exit reason IDs must reference valid lookup table entries
6. `transferredByOrganizationId`, `transferredByUnitId`, `transferredByTitleId` must reference valid org chart entries
7. If `currentOfficerId` is set, it must reference a valid FIELD user
8. `IncidentOfficer` rows should exist for the arresting officer on incident creation and for any receiving officer after handoff
9. BedType capacity invariant must be maintained: `capacity = available + holds + occupied + unavailableOccupied + unavailableUnoccupied`

---

### Audit Trail Records

Every state transition creates audit records:
- `DeflectionUpdate`: records the before/after of any deflection field change
- `BedTypeUpdate`: records capacity counter changes with each operation
- `FacilityUpdate`: records facility status changes

When generating synthetic data, generate corresponding audit records to ensure analytics queries work correctly.

---

## Key Enums Reference

```
HoldStatusEnum:       ACTIVE | CANCELLED | EXPIRED | COMPLETED
SubjectStatusEnum:    DETAINED | ONSITE_AWAITING_TRANSFER | AWAITING_INTAKE |
                      READY_FOR_INTAKE | FAILED_INTAKE | IN_MEDICAL_INTAKE | IN_CHAIR |
                      RELEASED | EXITED | DEATH_IN_FACILITY | DEATH_IN_CUSTODY
PropertyEnum:         NONE | SMALL | MEDIUM | LARGE
PropertyNotReturnedReasonEnum: ABANDONED | DESTROYED | OTHER
DrugTypeEnum:         CNS_DEPRESSANTS | CNS_STIMULANTS | HALLUCINOGENS |
                      DISSOCIATIVE_ANESTHETICS | NARCOTIC_ANALGESICS |
                      INHALANTS | CANNABIS
EncounteredViaEnum:   ON_VIEW | DISPATCHED
FacilityStatusEnum:   CLOSED | OPEN_NOT_ACCEPTING | OPEN_ACCEPTING
FacilityTypeEnum:     DIDO | LESC
BedTypeEnum:          BED | CHAIR
TernaryEnum:          YES | NO | UNKNOWN
SFResidentEnum:       YES | NO | UNKNOWN | DECLINED_CONSENT
RoleEnum:             FIELD | CUSTODY | CARE
SexEnum:              MALE | FEMALE | OTHER
```
