# Cross-Streets — Implementation Plan

Companion to `docs/cross-streets.md` (investigation & design decisions). Read that first if you haven't.

## Recap of locked-in decisions

- **A1 — Storage**: discriminator + `street1`/`street2` columns on `Incident`, plus DataSF `cnn` as `intersectionId`. All existing rows backfilled to `locationType = 'ADDRESS'`.
- **B1 — UX**: single unified Location field, mode auto-detected from connector tokens (`&`, ` and `, ` at `, `/`, `@`).
- **C1 — Voice**: extend existing `AudioRecorder` onto the Location field, mic visible on the collapsed view. AWS Transcribe with DataSF-built Custom Vocabulary; server-side Double Metaphone fuzzy match against the SF street list. Confirmation chip before commit.
- **E — Between context**: included. After resolving an address, show "between X and Y" using a local DataSF lookup.
- **Intersection geocoding source**: DataSF `jfxm-zeee` vendored locally. **No AWS Location calls for intersections.**
- **Scope**: FIELD-role users only (today's `/incident` route gating). Incident location only — Subject/Facility address unchanged. SF-only — no multi-jurisdiction abstraction yet.

## Phases at a glance

| Phase | What                            | Depends on |
| ---   | ---                             | ---        |
| P1    | Data pipeline (vendored DataSF) | —          |
| P2    | Schema migration                | —          |
| P3    | Server endpoints + voice route  | P1, P2     |
| P4    | Client UI (LocationAutocomplete + mic) | P3   |
| P5    | Display sites (lists, details, map links, "between" context) | P2 |
| P6    | Tests (interleaved through P1–P5; called out explicitly here) | — |
| P7    | Rollout, instrumentation, follow-up gate | P4 |

P1, P2 are independent and can start in parallel. P5 can start after P2 lands. P3 needs both. P4 follows P3.

---

## Phase 1 — Data pipeline

### Goal

Produce a vendored, normalized JSON index of SF intersections, refreshable via script. Same data feeds the server endpoint (P3), the typeahead (P4), and the Transcribe Custom Vocabulary build (P3).

### Files to create

- `server/data/sf-intersections.json` — vendored output (~500 KB gzipped). Checked into the repo.
- `server/data/sf-streets.json` — derived street name list (with canonical suffix + aliases) for the Transcribe vocabulary and the phonetic matcher.
- `server/scripts/build-intersection-data.js` — fetches DataSF `jfxm-zeee` (paginated; ~21k rows), normalizes, writes both JSON files. Can be re-run quarterly.
- `server/lib/intersections.js` — load JSON at boot, expose `search(text)`, `findByCnn(cnn)`, `findNearest(lat, lng, n)`.
- `server/lib/streetNormalization.js` — pure functions: `normalizeStreet(input) → string[]` (returns candidate prefixes; see Part 9 in `cross-streets.md`), `displayName(rawName) → string` (title-case + canonical-suffix), `expandSuffix(input) → string`.

### `sf-intersections.json` shape (proposal)

```json
[
  {
    "cnn": "24183000",
    "street1": "16TH ST",
    "street2": "VALENCIA ST",
    "lat": 37.76491732,
    "lng": -122.42188634,
    "zip": "94103"
  },
  ...
]
```

Single entry per intersection (dedupe by CNN at build time — DataSF stores both A→B and B→A orderings). Sorted by `street1` then `street2` for predictable diff in PRs.

### `sf-streets.json` shape (proposal)

```json
[
  { "name": "16TH ST",        "display": "16th St",          "base": "16th",         "suffix": "St" },
  { "name": "VALENCIA ST",    "display": "Valencia St",      "base": "Valencia",     "suffix": "St" },
  { "name": "JUNIPERO SERRA BLVD", "display": "Junipero Serra Blvd", "base": "Junipero Serra", "suffix": "Blvd" },
  { "name": "THE EMBARCADERO", "display": "The Embarcadero", "base": "Embarcadero",  "suffix": null, "aliases": ["EMBARCADERO"] },
  { "name": "BAY SHORE BLVD",  "display": "Bay Shore Blvd",   "base": "Bay Shore",   "suffix": "Blvd", "aliases": ["Bayshore"] }
]
```

Built by deduping all `street_name_1` values across `jfxm-zeee`. Aliases hand-curated (currently: `Embarcadero` → `THE EMBARCADERO`, `Bayshore` → `BAY SHORE BLVD`) and stored in a small `streetAliases.json` companion that the build script merges in.

### Normalization rules (codified)

From Part 9 findings:

1. Long-form suffix → abbreviation: `STREET → ST`, `AVENUE → AVE`, `BOULEVARD → BLVD`, `LANE → LN`, `DRIVE → DR`, `ROAD → RD`, `WAY → WAY`, `HIGHWAY → HWY`.
2. Strip trailing suffix for prefix-match candidate.
3. Zero-pad single-digit numbered streets: `3RD → 03RD`, `7TH → 07TH`.
4. Try with and without leading `THE`.
5. Apply explicit alias map (`Bayshore → Bay Shore`).

`normalizeStreet()` returns the union of all candidate prefixes so we can query multiple variants.

### Acceptance

- `node scripts/build-intersection-data.js` produces both JSON files; output is deterministic (same input → same JSON).
- `server/lib/intersections.js` loads the JSON synchronously at module import time (boot cost <100ms).
- All 30 intersections from the Part 9 bench resolve through `search()` to a correct match.
- `streetNormalization.test.js` covers each rule with a positive and negative case.

### Open implementation questions

- **Q-P1-a**: Where do the JSON files live — `server/data/` or a shared `data/` at repo root? Server-side use only in v1, so `server/data/` is fine.
- **Q-P1-b**: Refresh cadence — quarterly cron, manual, or CI? **Lean: manual for v1**; document the command in `CONTRIBUTING.md` (or a script comment). DataSF data changes slowly.

---

## Phase 2 — Schema migration

### Goal

Extend `Incident` to carry intersection data alongside address data, with a discriminator and backward-compatible defaults.

### Files to modify

- `server/prisma/schema.prisma` (Incident model, ~line 706+):
  ```prisma
  model Incident {
    // existing fields ...
    locationType   IncidentLocationType @default(ADDRESS)
    street1        String?
    street2        String?
    intersectionId String?   // DataSF CNN, when matched
  }

  enum IncidentLocationType {
    ADDRESS
    INTERSECTION
  }
  ```
- `server/models/incident.js` — extend Zod schema with the three new fields + enum.
- `client/src/utils/validators.js:40-50` — split the IncidentSchema into a discriminated union (or a conditional refinement): when `locationType = ADDRESS`, require `addressLine1`/`city`/`state`; when `INTERSECTION`, require `street1`/`street2`. `latitude`/`longitude` optional in both (best-effort).
- `client/src/utils/format.js:7-9` — `formatAddress(record)` branches: intersection → `"${title(street1)} & ${title(street2)}"`; address → existing behavior.

### Migration

Dev (Docker): `prisma db push --accept-data-loss` (per CLAUDE.md memory pattern). Existing rows get `locationType = 'ADDRESS'` automatically via the column default — verify with a sanity-check query post-push.

Production: a generated migration with `ADD COLUMN locationType ... NOT NULL DEFAULT 'ADDRESS'` is safe — applies the default to existing rows in one statement.

### Acceptance

- Existing incidents read normally; new field defaults to `ADDRESS`.
- A new incident can be created via the API with `locationType: 'INTERSECTION'` carrying `street1`/`street2`/`intersectionId`/`latitude`/`longitude` and nullable address fields.
- Server Zod schema and client validators agree on the discriminated shape.

### Open implementation questions

- **Q-P2-a**: Do we ever need to clear address fields when transitioning a record from ADDRESS → INTERSECTION? **Lean: yes** — when the user changes the mode at edit time, blank the other side cleanly so we don't carry phantom data.

---

## Phase 3 — Server endpoints

### Goal

Three server-side capabilities: (1) intersection typeahead, (2) the "between" context lookup, (3) voice transcription with location-mode post-processing.

### Files to create

- `server/routes/api/geocode/intersections.js` — `GET /api/geocode/intersections?text=…` and `GET /api/geocode/intersections/nearest?lat=…&lng=…&n=2`.
  - The text endpoint: parse the input on connector tokens; for each side, normalize and prefix-match against `sf-streets.json`; return up to 10 candidate intersections from `sf-intersections.json` joining both sides.
  - The nearest endpoint: given a lat/lng, return the N nearest intersection nodes for "between context."
  - Auth: required (mirror existing `/api/geocode/search`).
- `server/lib/phoneticMatch.js` — exports `matchStreet(rawToken, streetList) → { candidate, score }[]`. Uses Double Metaphone (from `natural` npm) plus a Levenshtein tiebreak.
- `server/scripts/build-transcribe-vocabulary.js` — reads `sf-streets.json`, emits a CSV in AWS Transcribe Custom Vocabulary format. Optionally uses AWS SDK to create/update the vocab resource. Output: a vocabulary name to set in `AWS_TRANSCRIBE_VOCABULARY_NAME`.

### Files to modify

- `server/routes/api/ai/transcribe.js`:
  - Accept an optional query param `mode` (`narrative` | `location`, default `narrative`).
  - For `narrative`: existing behavior, returns the transcript string.
  - For `location`: after transcription, run the result through a parse pipeline:
    1. Tokenize on `&`, ` and `, ` at `, `/`, `@`.
    2. For each side, call `phoneticMatch.matchStreet` against `sf-streets.json`, take top 3.
    3. For each (left-candidate × right-candidate) pair, look up in `sf-intersections.json`.
    4. Return `{ transcript, parsed: { side1Candidates, side2Candidates }, matches: [{ cnn, street1, street2, lat, lng, score }] }`.
- `server/lib/location.js` — no changes for v1 (AWS path stays on traditional address only).

### Dependencies to add

- `natural` (~2 MB; provides DoubleMetaphone, NYSIIS, JaroWinklerDistance). Server workspace only.

### Acceptance

- `curl '/api/geocode/intersections?text=16th%20%26%20Valencia'` returns one candidate at `(37.76491732, -122.42188634)`.
- `curl '/api/geocode/intersections?text=Junipero+%26+Monterey'` returns the Junipero Serra Blvd × Monterey Blvd match (verifies prefix-match handles a partial first street).
- `curl '/api/geocode/intersections/nearest?lat=37.7657&lng=-122.4194&n=2'` returns the two nearest intersection rows.
- `POST /api/ai/transcribe?mode=location` with a known audio file containing "Junipero Sarah and Monterey" returns `parsed.side1Candidates[0].name = 'JUNIPERO SERRA BLVD'` and `matches[0].cnn` set. (Junipero Serra fuzzy-match validation.)
- `node scripts/build-transcribe-vocabulary.js --upload` creates an AWS Transcribe Custom Vocabulary named `care-connect-sf-streets-v1`. Env var `AWS_TRANSCRIBE_VOCABULARY_NAME=care-connect-sf-streets-v1` activates it.

### Open implementation questions

- **Q-P3-a**: 2k-word vocabulary — submit as one resource, or split? **Lean: one** (per Part 5 Q4). Build the script to handle splitting trivially if needed later.
- **Q-P3-b**: Streaming Transcribe doesn't give us n-best. Do we fall back to batch transcribe (which does support n-best) when the streaming result's fuzzy-match score is low? **Lean: not in v1.** First try streaming + fuzzy match; measure. If accept rate is below ~80%, add the batch-retry path in P7.
- **Q-P3-c**: `intersectionId` resolution on submit — the client gets a list of `{ cnn, street1, street2, lat, lng }` candidates from the endpoint. We submit the one the user picks. **No separate resolve call needed.** Make sure the endpoint returns `cnn` so the client can pass it through to the incident write.

---

## Phase 4 — Client UI

### Goal

A new `LocationAutocomplete` that handles both address and intersection input in one field, with the mic visible on the collapsed view.

### Files to create

- `client/src/components/LocationAutocomplete.jsx`:
  - Accepts a Mantine form instance (same pattern as `AddressAutocomplete`).
  - Internal debouncer (300ms, matching existing).
  - Detects connector tokens client-side. If detected: query `/api/geocode/intersections`. Otherwise: query `/api/geocode/search` (today's address path).
  - Suggestion list renders both result types with a small type chip (`⌗` intersection, `📍` address).
  - On selection: dispatch a single `setValues` that writes either the address fields *or* the intersection fields (and clears the other), and sets `locationType`. Sets `intersectionId` to `cnn` when picking an intersection result.
- `client/src/components/LocationVoiceButton.jsx` — small button (Mantine `ActionIcon`) that wraps the existing `AudioRecorder` machinery but submits to `/api/ai/transcribe?mode=location`. On result, hand off to a candidate-picker callback.
- `client/src/components/LocationConfirmationChip.jsx` — inline chip displayed under the field after voice resolution: "Heard: '…'. Did you mean: [16th St & Valencia St ✓] [16th St & Mission St] [×]". Buttons trigger the same `setValues` flow as a manual selection.

### Files to modify

- `client/src/lesc/components/IncidentForm.jsx:262-333`:
  - Replace `AddressAutocomplete` with `LocationAutocomplete` inside the expanded view.
  - Collapsed view: add `LocationVoiceButton` to the `rightSection` next to the existing location icon. Mic is visible by default.
  - Collapsed display: render either `formatAddress(record)` or `"${street1} & ${street2}"` based on `record.locationType`.
  - Auto-fill on new incident open: when reverse-geocoding succeeds, set `locationType: 'ADDRESS'` and the address fields (today's flow). No intersection mode from device location (per the Decision-D-dropped resolution).
- `client/src/utils/format.js:7-9` — add `formatLocation(record)` that branches on `locationType`; refactor call sites in P5 to use it.
- `client/src/services/Api.js` (or wherever `Api.geocode.*` lives) — add `Api.geocode.intersections(text)` and `Api.geocode.intersectionsNearest(lat, lng, n)`.

### UX details (compact specs)

Collapsed view:
```
┌─ Location ─────────────────────────────┬───┬───┐
│ <formatted address or intersection>    │ 🎤 │ ⌖ │
└────────────────────────────────────────┴───┴───┘
```

Tap mic → recording UI replaces the chrome inline (existing `AudioRecorder` pattern, no modal). On result → confirmation chip below:
```
┌─ Location ─────────────────────────────┬───┬───┐
│ 16th St & Valencia St                  │ 🎤 │ ⌖ │
├────────────────────────────────────────┴───┴───┤
│ Heard: "16th and Valencia"                     │
│ Matches: [16th St & Valencia St ✓]             │
│          [16th St & Mission St] [✗ retry]      │
└────────────────────────────────────────────────┘
```

Picking a match commits to the form. Pressing × clears the chip and keeps the prior value.

Expanded view (tap the field to expand):
- When `locationType=INTERSECTION`: show `street1` + `street2` as two TextInputs, plus an optional `city` (defaulted to "San Francisco"). Hide `addressLine1`/`addressLine2`/`state`/`postalCode`.
- When `locationType=ADDRESS`: today's layout exactly. No changes.
- A small mode toggle link at the top of the expanded view: "Switch to intersection" / "Switch to address" — covers the rare case where auto-detect was wrong and the officer wants to override.

### Acceptance

- Type `16th & Valencia` → suggestion list shows intersection matches; selecting one populates form with `locationType=INTERSECTION`, `street1='16TH ST'`, `street2='VALENCIA ST'`, `intersectionId='24183000'`, lat/lng.
- Type `425 16th St` → behaves exactly like today: address suggestions, address fields populated.
- Tap mic, say "Junipero Sarah and Monterey" → confirmation chip shows "Junipero Serra Blvd & Monterey Blvd" as the top match; tapping commits.
- Existing incidents with `locationType=ADDRESS` render correctly in the collapsed view.
- Form submit produces a valid incident record on the server for both modes.

### Open implementation questions

- **Q-P4-a**: When auto-detect fires mid-typing (user types `16th &` between keystrokes), do we re-query on every keystroke or wait for the user to stop typing? **Lean: same 300ms debounce as today** — re-query the appropriate endpoint each debounce-tick.
- **Q-P4-b**: Should the mode toggle link in the expanded view be eliminated in favor of pure auto-detection? **Lean: keep it as a safety valve for v1**; remove after we observe whether it gets used.
- **Q-P4-c**: Recording UI when the field is collapsed — does the field expand to show the chip, or does the chip appear *under* the still-collapsed field? **Lean: chip under the collapsed field** (matches the user's stated preference in Q6 — don't force expansion).

---

## Phase 5 — Display sites + 5150 + map link + "between" context

### Goal

Every place that reads the incident location needs to handle both modes. Plus the "between" context UX freebie (Decision E).

### Files to modify

- `client/src/lesc/components/Incident.jsx:8,23` — replace inline `addressLine1 + addressLine2` concat with `formatLocation(incident)`.
- `client/src/lesc/components/custody/CustodyDetailContent.jsx:188` — same.
- `client/src/utils/format.js` — implement `formatLocation()` (created in P4); keep `formatAddress()` for legacy call sites that genuinely want only the address part.
- `client/src/components/facilityAddressLink/` — generate a Google/Apple Maps URL for intersection mode. Google Maps accepts `?q=16th+St+%26+Valencia+St,+San+Francisco,+CA` and pins the intersection. Apple Maps similar.
- `server/lib/forms/5150/generate.js` — no change for v1 (form uses subject address, not incident location). **If** that changes later, add a branch: when `subject` has only intersection-mode incident location, render the intersection string into the "and residing at" field. Per Q3 in `cross-streets.md`, render in human-readable form (`16th St & Valencia St`).

### "Between" context

- New UI element under the Location field on the **incident detail page** (and possibly the collapsed Location chrome): "between Valencia St and Guerrero St."
- Fetched via `/api/geocode/intersections/nearest?lat=…&lng=…&n=2` (created in P3). Server walks `sf-intersections.json` for nodes on the same street as the address, sorted by distance.
- Only fires when `locationType=ADDRESS` and lat/lng is populated. No "between" context for intersection-mode records (the intersection itself is the context).
- Cached per incident — once resolved, store the result alongside the incident (small string, no schema change needed — could be a transient client-side computation).

### Acceptance

- Incident list rows render both address and intersection records correctly.
- Custody detail page shows the location in both modes.
- Google/Apple Maps deep link works for an intersection (verify by tapping).
- Address-mode incidents show a "between X and Y" line; intersection-mode incidents do not.
- 5150 PDF generation unchanged (no incident location involved).

### Open implementation questions

- **Q-P5-a**: "Between" — compute on client (using the same DataSF JSON if shipped to client) or server? **Lean: server.** Client doesn't need the full intersection index; the lookup is fast on the server (~10k entries, in-memory).
- **Q-P5-b**: When the address resolution has a null lat/lng (older records, or a manually-entered address), skip the "between" line silently. Easy.

---

## Phase 6 — Tests

Interleaved with each phase. Called out explicitly so nothing falls through.

### Server

- `server/test/lib/streetNormalization.test.js` — every normalization rule, plus negative cases (no over-normalization).
- `server/test/lib/intersections.test.js` — load fixture, search for the 30 bench intersections, expect 29/30 + 1 multi.
- `server/test/lib/phoneticMatch.test.js` — Double Metaphone matches: "Junipero Sarah" → "Junipero Serra"; "Cesar Charvez" → "Cesar Chavez"; "Embarcadiro" → "The Embarcadero". Include negative cases.
- `server/test/routes/api/geocode/intersections.test.js` — endpoint behavior, including "no match," multi-match, and prefix-match cases.
- `server/test/routes/api/ai/transcribe.test.js` — extend with a `mode=location` case using a mocked Transcribe response; verify the response shape.
- `server/test/routes/api/incidents/create.test.js` — extend to cover an intersection-mode create.

### Client

- `client/src/components/LocationAutocomplete.test.jsx` — connector detection, mode switching, selection writes correct fields.
- `client/src/lesc/components/IncidentForm.test.jsx` — extend to cover intersection-mode submit; mode toggle link.
- Don't bother snapshot-testing the confirmation chip rendering — covered by manual UX testing.

### Manual / browser

- Voice path end-to-end on a real mobile device — desktop browser will work but iOS Safari is the high-risk environment per the existing Web Speech API memory note (we're not using Web Speech, but iOS audio capture has its own quirks).
- Print a 5150 PDF for an incident whose subject lives at an intersection address — confirm the "and residing at" field still renders sensibly (no change expected; verify).

---

## Phase 7 — Rollout, instrumentation, follow-up gate

### Instrumentation (added during P3/P4)

Log structured events (PostHog or whatever the project uses; check existing patterns):

- `location_input_mode`: `address` | `intersection`, on every incident submit.
- `voice_transcribe`: `{ mode, raw_transcript, top_match, score, user_action: 'accepted'|'edited'|'rejected' }`, on every voice flow completion.
- `intersection_lookup_miss`: when an officer enters a cross-street that has no match in `sf-intersections.json`. Watch this for SF-data gaps that need the alias map.
- `between_context_resolved`: lat/lng → nearest-intersection success/fail.

### Review gate (2–4 weeks after FIELD rollout)

Three metrics drive the next decision:

1. **Adoption**: what % of new incidents use intersection mode? If <10%, did we expose the feature well enough?
2. **Voice accept rate**: of voice-initiated entries, what % does the officer accept the top match? Target ≥80%.
3. **Lookup miss rate**: what % of intersection submits had no DataSF match? Target ≤5%. If higher, expand the alias map.

If voice accept rate is below 80% and the failure mode is dominated by proper-noun street names: **escalate to Deepgram Nova-3 with Keyterm Prompting** for the location path only (keep AWS Transcribe for narrative). Concrete next-task: add a Deepgram client behind a feature flag, A/B against AWS Transcribe on the same audio for a week.

If lookup misses cluster around specific street name aliases: extend `streetAliases.json` and re-build.

### Out of scope for v1 (deferred)

- Subject address intersection support.
- Facility address intersection support.
- Multi-jurisdiction street data (anything beyond SF).
- what3words integration.
- LLM/Bedrock natural-language parsing ("near 16th and the BART").
- AWS Autocomplete sanity-check layer.
- N-best AWS Transcribe batch retry on low-confidence streaming results.
- Refactoring address out of `Incident` into a polymorphic `Location` table.

---

## File-level summary (delivery checklist)

### New files

| Path                                                  | Phase |
| ---                                                   | ---   |
| `server/data/sf-intersections.json`                   | P1    |
| `server/data/sf-streets.json`                         | P1    |
| `server/data/streetAliases.json` (hand-curated)       | P1    |
| `server/scripts/build-intersection-data.js`           | P1    |
| `server/scripts/build-transcribe-vocabulary.js`       | P3    |
| `server/lib/intersections.js`                         | P1    |
| `server/lib/streetNormalization.js`                   | P1    |
| `server/lib/phoneticMatch.js`                         | P3    |
| `server/routes/api/geocode/intersections.js`          | P3    |
| `server/test/lib/streetNormalization.test.js`         | P6/P1 |
| `server/test/lib/intersections.test.js`               | P6/P1 |
| `server/test/lib/phoneticMatch.test.js`               | P6/P3 |
| `server/test/routes/api/geocode/intersections.test.js`| P6/P3 |
| `client/src/components/LocationAutocomplete.jsx`      | P4    |
| `client/src/components/LocationVoiceButton.jsx`       | P4    |
| `client/src/components/LocationConfirmationChip.jsx`  | P4    |
| `client/src/components/LocationAutocomplete.test.jsx` | P6/P4 |

### Modified files

| Path                                                            | Phase  |
| ---                                                             | ---    |
| `server/prisma/schema.prisma`                                   | P2     |
| `server/models/incident.js`                                     | P2     |
| `server/routes/api/ai/transcribe.js`                            | P3     |
| `server/test/routes/api/ai/transcribe.test.js`                  | P6/P3  |
| `server/test/routes/api/incidents/create.test.js`               | P6/P2  |
| `client/src/utils/validators.js`                                | P2     |
| `client/src/utils/format.js`                                    | P2/P5  |
| `client/src/services/Api.js` (or equivalent geocode client)     | P4     |
| `client/src/lesc/components/IncidentForm.jsx`                   | P4     |
| `client/src/lesc/components/Incident.jsx`                       | P5     |
| `client/src/lesc/components/custody/CustodyDetailContent.jsx`   | P5     |
| `client/src/components/facilityAddressLink/`                    | P5     |
| `client/src/lesc/components/IncidentForm.test.jsx`              | P6/P4  |

### Dependencies added

- `server`: `natural` (Double Metaphone, NYSIIS, Levenshtein) — ~2 MB.

### PR split (suggested)

Three PRs feels right; this is a feature with three natural seams.

1. **PR 1 — Data + schema** (P1 + P2). Pure foundation. Reviewable on its own, low blast radius.
2. **PR 2 — Server + display** (P3 + P5). Backend endpoints, display branching, "between" context. Visible behavior change for existing addresses (the "between" line) but no UX-breaking change.
3. **PR 3 — Client UX + voice** (P4). The user-facing feature. Lands behind a measure-and-iterate gate (P7).

Alternative: one bundled PR if review velocity favors it. Lean: three PRs for review tractability — but if reviewer prefers bundling, easy to combine.
