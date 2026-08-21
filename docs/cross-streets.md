This is a research/investigation project.
- Currently, the app asks for an Incident address. The user must ultimately input a street address (though we offer a few kinds of assistance: we try to reverse-geocode your device location to produce an address automatically; and we offer type-ahead assistance against a database of addresses in SF.)
- Our users in the FIELD role are police officers. They are very accustomed to reporting a location in terms of cross-streets, rather than a numbered street address. E.g. "16th & Valencia". Having to find and input a nearby street address adds friction to the workflow.

So the question is: is there an effective and delightful way to honor this preference?

This change would be non-trivial. We'd first need to investigate the current codebase:
- Do we currently store address information in a way that assumes a street address?
- What are all the ways that we use/validate the stored address? If we changed the storage, those might need to change.

This is also not a novel problem, so we should explore existing best practices used by other applications that need to support 'address' input and need to support both traditional addressses and cross-streets.

Then there are some UX questions that arise:
- If we're giving the user the option to input either a street address or cross-streets, what does the UX look like? Do we offer an explicit choice? Is there a way to offer a unified input and simply interpret the user's input in an intelligent way? (Note that the input is already a bit complex here - I think it's sometimes displayed a single text field, but sometimes broken out into into one field per address-part; I'm not sure exactly what triggers the change.)
- We'd probably want to use voice input to allow the officer to speak cross-streets. If we do this, is there a technique we can use to improve accuracy by matching against real cross-streets? For example, a really naive approach would be to first translate the speech to text, then use the text to search a cross-street database of some kind. But this might result in a transcription where the officer says "Junipero Serra & Monterey" and this gets transcribed incorrectly as "Junipero Sarah & Monterey", which could subsequently fail when we search it. Are there techniques for matching this against a list of known cross-streets? (I can imagine that either you get the transcription service to return multiple candidates, and you pick the best one; or maybe we can provide a "vocab" list of all the street names in SF, and ask the transcriber to try and match to those? Or open to other ideas.)

Just noting that this project already uses a couple of external services that could be relevant. We use voice transcription (through AWS, I think) and geolocation/reverse-geocoding (also from AWS IIRC). So we may get some mileage out of those existing services when tackling this problem.

Please investigate this question thoroughly, both investigating the current codebase and also doing any public research that will help us understand best practices and technical options here. Then put on your designer hat and present design options (you can share which way you lean on each decision, if you have a strong preference.) Then produce a detailed written summary that we can review together in order to build an implementation plan for the feature.

---

# Investigation & Design Summary

This section is the findings synthesis. It is written to feed an implementation-planning conversation, not as the plan itself. Companion document with full external sources and citations: `docs/cross-streets-research.md`.

Author's POV: where I have a strong preference I say so and explain why. Treat the "recommended" calls as starting positions to push back on, not foregone conclusions.

---

## Part 1 — How the current app handles location

### 1.1 Storage (`server/prisma/schema.prisma`)

The `Incident` model embeds a single address inline (no separate `Address` table). All seven fields are nullable in the DB but several are required by the client validator:

| Field           | Type            | Client-required | Notes                              |
| ---             | ---             | ---             | ---                                |
| `addressLine1`  | `String?`       | ✅ (min 2)       | Street address, e.g. "425 16th St" |
| `addressLine2`  | `String?`       | optional        | Apt/suite                          |
| `city`          | `String?`       | ✅ (min 2)       |                                    |
| `state`         | `String?`       | ✅ (min 2)       |                                    |
| `postalCode`    | `String?`       |                 | 5-digit, stripped from ZIP+4       |
| `latitude`      | `Decimal(9,6)?` |                 | Stored as decimal                  |
| `longitude`     | `Decimal(9,6)?` |                 | Stored as decimal                  |

The same shape is used on `Facility` (with neighborhood/district extras) and `Subject` (PII-flagged).

Server-side Zod schema (`server/models/incident.js`) mirrors the columns but does not enforce required-ness — that lives only in the client (`client/src/utils/validators.js:40-50`).

### 1.2 Address input UI

- `client/src/components/AddressAutocomplete.jsx` — single-text-field typeahead. Debounces 300ms, hits `Api.geocode.search()` → `/api/geocode/search`. On selection, fills six fields at once via `form.setValues({ addressLine1, city, state, postalCode, latitude, longitude })` (lines 75-82).
- `client/src/lesc/components/IncidentForm.jsx:262-333` — two visual states:
  - **Collapsed**: read-only `TextInput` showing `formatAddress(...)` plus a "use current location" button.
  - **Expanded**: `AddressAutocomplete` for `addressLine1`, plus separate `TextInput`s for `addressLine2`, `city`, and a side-by-side `Group` for `state`/`postalCode`.
  - Switching is triggered by clicking/focusing the collapsed field (`setShowAddressForm(true)`).
- Note: the "single field vs split fields" the prompt asked about is *not* a different input mode — it's the same form, collapsed vs expanded. The collapsed view just *displays* the comma-joined parts.

### 1.3 Geocoding backend

- `server/lib/location.js` — wraps `@aws-sdk/client-geo-places` (AWS Location Service v2).
- Endpoints:
  - `GET /api/geocode/search?text=…` (`server/routes/api/geocode/search.js`) — calls AWS `Suggest` with a hard-coded SF bounding box `[-122.5155, 37.7080, -122.3570, 37.8120]`, max 5 results, returns `{ placeId, label, addressLine1, city, state, postalCode, neighborhood, latitude, longitude }`. Auth required.
  - `GET /api/geocode/reverse?latitude=…&longitude=…` — calls AWS `ReverseGeocode`, returns `{ addressLine1, city, state, postalCode }`. Currently does NOT require auth.
- Reverse-geocoding from device location: `client/src/utils/geocoding.js` → `getCurrentLocationAddress()` calls `navigator.geolocation.getCurrentPosition()` then hits `/api/geocode/reverse`. Auto-fires once on new-incident open if there is no existing address (`IncidentForm.jsx:147-154`).
- **There is no vendored local address database.** Everything is AWS.

### 1.4 Read/use sites for the address

| Site                                       | What it does                                                          |
| ---                                        | ---                                                                   |
| `Incident.jsx`                             | Renders `addressLine1` + `, addressLine2` on summary cards            |
| `CustodyDetailContent.jsx:188`             | Renders `formatAddress(incident)` on detail page                      |
| `utils/format.js:7-9`                      | Joins all six visible parts with commas                               |
| `components/facilityAddressLink/`          | Builds Google/Apple Maps URL from `formatAddress(...)`                |
| `server/lib/forms/5150/generate.js:20-22`  | Fills "and residing at" on 5150 PDF using **subject** address only    |
| `server/lib/forms/849b/`                   | Does **not** use address fields                                       |
| Handoff (`routes/api/deflections/handoff.js`) | Does not include address                                          |

There is currently **no address-based search/filter** anywhere in the app, and **no use of lat/lng beyond storage and map links**.

### 1.5 Voice transcription precedent

- Server: `server/routes/api/ai/transcribe.js` uses **`TranscribeStreamingClient` + `StartStreamTranscriptionCommand`**, English, 16kHz PCM, region `us-west-2`. Already has a hook for custom vocabulary: `commandParams.VocabularyName = process.env.AWS_TRANSCRIBE_VOCABULARY_NAME` (lines 53-64). Currently takes only the first alternative (line 71). No n-best.
- Client: `client/src/components/AudioRecorder.jsx` — captures 16kHz mono PCM, downsamples to `Int16Array`, base64-encodes, POSTs to `/api/ai/transcribe`. Max 180s.
- Used today only for the **Narrative field** (`DeflectionForm.jsx:146-150`). Append-to-field semantics: subsequent recordings concatenate with a space.

This is the precedent we'd extend for cross-street voice input.

### 1.6 What this tells us before designing

1. **The schema is not deeply opinionated about "street address."** The seven columns happen to model one, but nothing downstream other than the 5150 PDF (which uses the *subject* address, not the incident address) requires a fully-formed civic address. PDFs, displays, and map links all use string concatenation. **This means we have real freedom in how we represent intersections in storage.**
2. **The address autocomplete is a single text field already.** UX-wise, that's the same affordance you want for an "address-or-intersection" unified input. The expanded edit view is the only place that assumes structured-address parts.
3. **AWS Transcribe is already wired with a vocabulary hook** but the n-best response path is not. The custom vocabulary table itself does not exist yet (env var is unset by default).
4. **No tests pin down cross-street behavior** — that's a clean slate.

---

## Part 2 — External landscape (condensed)

Full sources in `docs/cross-streets-research.md`. The five findings that matter most for design:

1. **Intersection geocoding is a first-class concept everywhere except OSM.** Google Maps, Mapbox, Apple Maps, Uber, Lyft, Mark43, PremierOne, Hexagon, Tyler, RapidSOS all support it. Esri formalizes the connectors: `&`, `/`, `@`, `\`, `|`, plus `and`/`at` (US locale).
2. **AWS Location Service v2 supports intersections — but the *forward* path is documentation-light.** Response shapes have first-class `Address.Intersection: [string]` and `PlaceType: "Intersection"`. The well-documented case is the reverse-geocode "nearest intersection" feature (`AdditionalFeatures: ["Intersections"]`), which AWS explicitly markets for emergency services. **We need to empirically bench-test forward intersection queries on SF before relying on them.**
3. **DataSF publishes free, authoritative SF intersection + street-name datasets** (`ctsg-7znq`, `pu5n-qu5c`, `sw2d-qfup`, `3psu-pn9h`). ~2k street names, ~10–15k intersections. Small enough to vendor a static index. This is the strongest fallback if AWS coverage is patchy, and it doubles as the source of the STT custom vocabulary.
4. **AWS Transcribe Custom Vocabulary IPA/SoundsLike columns are silently deprecated for non-medical use.** This is the gotcha. We cannot teach Transcribe that "Junipero" sounds like "hoo-NEE-pear-o" directly. The fix is post-hoc phonetic match. If proper-noun accuracy stays bad after that, **Deepgram Nova-3 with Keyterm Prompting** is materially stronger (100 multi-word terms, ~90% keyword-recall improvement, streaming-friendly).
5. **The dominant UX pattern is a single text field with mode auto-detected from the connector.** No mode toggle. User types `&` or ` and ` → suggestion list flips to intersection results. Critically, CAD systems do this with **no street suffixes** in intersection mode (`BOSTON & COOK`, not `BOSTON ST & COOK ST`) — our matcher must handle that.

Two surprises worth flagging:

- **Uber added cross-streets for *privacy*, not navigation** — the UX we want to copy was validated against a completely different motivation, which is actually a reassuring signal that it's robust.
- **The phonetic failure mode is concentrated.** Most SF streets transcribe fine. The problems are the ~50 Spanish-/Irish-/historic-origin proper nouns: Junipero Serra, Cesar Chavez, Embarcadero, Geary, Masonic, Bayshore. A small curated correction dictionary may outperform the full custom-vocabulary approach.

---

## Part 3 — Design options & recommendations

There are four orthogonal decisions. I lay out options for each, then assemble the recommended end-to-end design.

### Decision A — Storage shape

**Option A1 — Discriminator + structured intersection columns** *(my recommendation)*

Add two nullable columns and a discriminator:

```
addressLine1   String?   (unchanged)
addressLine2   String?   (unchanged)
city           String?   (unchanged)
state          String?   (unchanged)
postalCode     String?   (unchanged)
latitude       Decimal?  (unchanged)
longitude      Decimal?  (unchanged)

-- new --
locationType   enum('ADDRESS','INTERSECTION') DEFAULT 'ADDRESS'
street1        String?
street2        String?
```

Semantics:

- `locationType = ADDRESS` (default, including all historical rows): existing six fields used. `street1`/`street2` null.
- `locationType = INTERSECTION`: `street1`, `street2`, `city`, `state`, `latitude`, `longitude` populated. `addressLine1`/`addressLine2`/`postalCode` null.

Pros:
- Migration is a no-op for existing rows — they already mean "address" because `addressLine1` is set. We can backfill `locationType = 'ADDRESS'` with a single SQL update; intent of historical rows is preserved verbatim (the user's stated constraint).
- Structured intersection data is queryable, exportable, and easy to render. We can match `street1`/`street2` against the SF street dictionary for normalization.
- Display code can branch cleanly: `if locationType=INTERSECTION then "${street1} & ${street2}" else formatAddress(...)`.
- Lat/lng remains the universal join point for maps and EIDD-style export (CLDXF-US doesn't have a clean "intersection-only" mode anyway — store both).
- The 5150 PDF problem (which uses *subject* address, not incident) is unaffected. If incident location ever feeds a PDF, the formatter has an easy branch.

Cons:
- Schema migration required. ~3 new fields, 1 enum.
- `formatAddress()` and every display site need branching logic. Manageable — `format.js` is one file.

**Option A2 — Reuse `addressLine1` as a free-text "location" field**

Stop treating `addressLine1` as a structured street address. Let it hold either `"425 16th St"` or `"16th & Valencia"`, with `latitude`/`longitude` as the source of truth for downstream consumers.

Pros: Zero schema change.

Cons: Lossy. Loses the ability to programmatically distinguish address from intersection, to canonicalize street names, or to ask "is this intersection valid?" The intent of historical rows is preserved literally but ambiguously. Every downstream consumer that wants to do anything beyond "render a string" has to re-parse `addressLine1`. **I'd avoid this.**

**Option A3 — Polymorphic `Location` table**

Extract a separate `Location` table with a discriminator and join from `Incident`/`Facility`/`Subject`.

Pros: Cleanest long-term shape.

Cons: Large refactor across three models for a feature that only needs new shape on `Incident`. Premature. We can do this later if needed.

**My call:** A1. Minimal schema change, no data loss, queryable, backward compatible.

### Decision B — Input UX

**Option B1 — Unified single field with auto-detected mode** *(my recommendation)*

The existing collapsed/expanded pattern stays. The differences:

- **Collapsed view**: still read-only. If location is an intersection, render `16th St & Valencia St` (with a small chip indicating "intersection"); if address, render existing `formatAddress(...)`. Same "use my location" button on the right.
- **Expanded view, single primary input**: replace `AddressAutocomplete` with a slightly smarter `LocationAutocomplete` that:
  - Accepts free-text input.
  - Detects the intersection connectors (`&`, ` and `, ` at `, `/`, `@`) client-side.
  - When detected, switches the backend call to intersection-search and the suggestion list to intersection results.
  - When not detected and input starts with a digit, behaves exactly like today's address autocomplete.
  - On selection, fills *either* the address fields *or* the intersection fields, and sets `locationType` accordingly. The other set is cleared.
- **Expanded view, contextual extras**:
  - If intersection mode is detected: show optional `city` (defaulted to "San Francisco") and a read-only confirmation chip showing the two normalized street names.
  - If address mode: show today's `addressLine2`/`city`/`state`/`postalCode` row.

ASCII sketch:

```
Collapsed (address):
┌─ Location ──────────────────────────────────────────┬───┐
│ 425 16th St, San Francisco, CA 94103                │ ⌖ │
└─────────────────────────────────────────────────────┴───┘

Collapsed (intersection):
┌─ Location ──────────────────────────────────────────┬───┐
│ 16th St & Valencia St · San Francisco       [✕]     │ ⌖ │
│ ↑ small "intersection" chip                         │   │
└─────────────────────────────────────────────────────┴───┘

Expanded — typing "16th &":
┌─ Location ──────────────────────────────────────────┬───┐
│ 16th &|                                             │ ⌖ │
├─────────────────────────────────────────────────────┴───┤
│  Suggestions (intersection mode auto-detected):         │
│  ⌗  16th St & Valencia St                               │
│  ⌗  16th St & Mission St                                │
│  ⌗  16th St & Guerrero St                               │
│  ⌗  16th St & Folsom St                                 │
└─────────────────────────────────────────────────────────┘

Expanded — typing "425 ":
┌─ Location ──────────────────────────────────────────┬───┐
│ 425 16|                                             │ ⌖ │
├─────────────────────────────────────────────────────┴───┤
│  Suggestions (address mode):                            │
│  📍 425 16th St, San Francisco, CA                      │
│  📍 425 16th Ave, San Francisco, CA                     │
│  📍 4251 16th St, San Francisco, CA                     │
└─────────────────────────────────────────────────────────┘
```

Pros: Echoes the validated Google/Uber/Mapbox pattern. Zero new taps for officers. Auto-detection is trivial client-side regex, no ML.

Cons: Officers need to know the convention (`&` or `and`). That's the universal radio/CAD convention so it's already familiar; we can show a one-line hint under the field on first use.

**Option B2 — Explicit toggle (Address | Intersection)**

A segmented control switches the form between address-input and intersection-input modes.

Pros: Less magic. No ambiguity.

Cons: Adds a tap and a decision before typing. Diverges from every consumer-grade pattern. **I'd avoid this** unless usability testing shows officers struggle with B1.

**Option B3 — "Add intersection" as a secondary affordance**

Address is primary; intersection is an "+ add intersection" link below.

Cons: Tells the officer "your preferred input is the secondary one." Backwards.

**My call:** B1. Mirror the consumer pattern, keep the existing collapsed/expanded chrome.

### Decision C — Voice input

**Option C1 — Extend the existing AudioRecorder onto the Location field, with a vocabulary + post-hoc fuzzy match** *(my recommendation)*

Concretely:

1. **Build an AWS Transcribe Custom Vocabulary** from DataSF `3psu-pn9h` (all SF street names, current + retired aliases). Upload it via the Transcribe console or a one-shot script. Set `AWS_TRANSCRIBE_VOCABULARY_NAME` in env.
2. **Reuse `AudioRecorder` on the Location field**, swapping the `onTranscription` handler so the result feeds the location parser instead of appending to a narrative.
3. **Server-side post-processing** (in `routes/api/ai/transcribe.js` or a new route specialized for location): after Transcribe returns, tokenize on connector words/symbols, then for each token compute Double Metaphone (or NYSIIS) and match against the pre-computed phonetic index of SF streets. Pick the best candidate per side; return the structured `{ street1, street2 }` *plus* the raw transcript.
4. **Show a confirmation chip** before geocoding: `Heard: "Junipero Serra & Monterey" → 16th St… no wait → Junipero Serra Blvd & Monterey Blvd · tap to confirm`. CAD systems do this. It's cheap, prevents silent misroutes.
5. **N-best path**: not available in Transcribe streaming. If the fuzzy-match top candidate's confidence is low, fall back to a synchronous batch retranscription request with `ShowAlternatives=true, MaxAlternatives=5`, then try each alternative through the same matcher. Only do this on low-confidence first pass.

Pros:
- We keep AWS Transcribe; one streaming round-trip in the happy path.
- DataSF vocab + Double Metaphone fixes the *exact* failure mode the prompt called out ("Junipero Sarah" → "Junipero Serra").
- Zero new vendor relationship, no new credentials.
- Built on `AudioRecorder`, which is already in production for narrative dictation.

Cons:
- IPA/SoundsLike hints don't help us (deprecated). The fuzzy step is where the magic happens, not in Transcribe itself.
- Real-world accuracy on the hard street names is unknown until measured.

**Option C2 — Switch the location flow to Deepgram Nova-3 with Keyterm Prompting**

Pros: Strongest in-class biasing toward a known lexicon (claimed ~90% keyword-recall lift; multi-word terms; preserves casing). Streaming-friendly.

Cons: New vendor, new credentials, separate SDK alongside AWS Transcribe (because we'd keep AWS for narrative).

**My call:** C1 first. Instrument it (log every transcribe → match → confirm/correct cycle). If we hit a measured failure-rate floor we can't get below — say >15% of voice-entered locations need manual correction — escalate to C2 for the location path only.

**Option C3 — Skip voice for v1**

Pros: Smaller scope.

Cons: The whole point of the feature is field ergonomics; voice is the highest-leverage piece. **I'd avoid this.**

### Decision D — Reverse-geocoding from device location

We currently auto-reverse-geocode on new incident open and offer a button to re-fetch. With intersections in the picture:

**Option D1 — Offer "nearest intersection" alongside "nearest address" as picker** *(my recommendation)*

When the location button is tapped, fire two AWS calls in parallel:
1. `ReverseGeocode` → nearest address (today).
2. `ReverseGeocode` with `AdditionalFeatures: ["Intersections"]` → nearest intersection(s).

Show a small picker:

```
We located you near:
  ○ 425 16th St                    [address]
  ● 16th St & Valencia St          [intersection]
  ↑ default-selected for FIELD users; default-selected per user preference otherwise
```

The default-selected option respects user role: FIELD users default to intersection, others to address. After v1, learn from individual user behavior.

Pros: Acknowledges that officers prefer intersections without forcing the choice every time on every other user. Costs one extra cheap AWS call.

Cons: One extra UI element. We can keep it visually minimal.

**Option D2 — Always reverse-geocode to intersection for FIELD role**

Pros: Lowest UI friction.

Cons: Forecloses on cases where the officer wants a precise address (e.g., a specific apartment building).

**My call:** D1. Cheap, respects preference, easy to evolve.

### Decision E — "Between" context (free win)

Independent of the above: whenever we resolve an address, we can also fetch the nearest two intersections and surface them as read-only context.

```
425 16th St
between Valencia St and Guerrero St
```

This is a CAD convention, costs one extra reverse-geocode per address, and is materially useful for officers reading a location over radio. **Recommend including in v1.**

---

## Part 4 — Recommended end-to-end design (the picks, assembled)

> **⚠ Revised after bench testing.** The original recommendation here had AWS Location Service as primary with DataSF as fallback. Empirical testing (see **Part 8** below) showed AWS forward intersection geocoding is unreliable for SF — silent-fail rate ≥27%, with dangerous misparses ("16th & Mission" → "house number 16 on Mission St"). **DataSF is now primary; AWS is out of the cross-street path entirely.** The other decisions are unchanged.

Storage: **Option A1** — discriminator + `street1`/`street2`. Backfill all existing rows to `locationType = 'ADDRESS'`.

UX: **Option B1** — unified single field, mode auto-detected from connectors. Same collapsed/expanded chrome as today.

Voice: **Option C1** — extend `AudioRecorder` onto the Location field, **visible on the collapsed view** so officers discover it. AWS Transcribe with a DataSF-derived Custom Vocabulary plus server-side Double-Metaphone fuzzy match against the SF street list. Show a confirmation chip before commit. Measure; reserve Deepgram as the escalation path.

Reverse geocoding from device location: **dropped** — when the officer uses device location to populate the field, we record a traditional address (today's behavior, unchanged). No two-result picker.

"Between" context: include in v1.

Geocoding source (**revised**): **vendored DataSF intersection index as primary.** No AWS Location calls for intersection input. AWS Location continues to serve the existing traditional-address autocomplete and current-location reverse geocoding paths.

Scope: this feature changes the form for **FIELD-role users only** (confirmed: `/incident` is gated to `UserRole.FIELD` in `AppRedirectsConfig.jsx:14-16`). No settings toggle; the unified-field UX is the new default for everyone who can reach the form.

Standards posture: store both the structured `{ street1, street2 }` and lat/lng on every intersection-mode incident. That's all we need to be EIDD-compatible later, without committing to EIDD now.

---

## Part 5 — Open questions for the implementation plan

These are the calls I'd want to make jointly before writing code, in rough priority:

1. **Does AWS Location v2 actually forward-geocode SF intersections well?** This is the single biggest unknown. Concrete test: pick 30 SF intersections (a mix of major arterials, alley intersections, Spanish-name corners, Mission grid, Sunset numbered grid) and bench-test AWS `Geocode` + `Autocomplete` against them. If hit rate is below ~95%, lean on DataSF as primary rather than fallback.
2. **Does FIELD role get a different default, or does every user get a "show me intersections too" toggle in settings?** I leaned role-based; if the role split matters operationally, this becomes a tickbox rather than a default.
3. **5150 PDF behavior when incident location is an intersection.** Today the 5150 uses subject address (not incident). If that changes — or if SFSO wants the incident location on a future form — we need to decide: render `16th St & Valencia St` literally, or refuse to fill the field and show a warning, or require the officer to add a `addressLine1` even when the primary location is an intersection. **My lean:** render the intersection string literally; PDF fields are free-text, and "intersection of 16th & Valencia" is acceptable to dispatch downstream.
4. **Vocabulary scope.** DataSF lists ~2k SF street names plus ~hundreds of aliases. AWS Transcribe's "best results" target is ~300 words; we'd need to either split into focused sub-vocabularies (downtown, west side, etc.) or accept that all 2k go in one table and measure. The blog-post precedent suggests 2k is fine in practice — the 300 number is a soft recommendation, not a hard limit. **My lean:** single vocabulary with all street base names (no suffix variants), measure, split if needed.
5. **Where does the DataSF data live?** Options: (a) check the JSON into the repo, refresh via a script; (b) server-side cache populated at deploy time; (c) S3-hosted JSON the client fetches once and caches. **My lean:** (a) for v1 — simplest, no infra, file is small (well under 1 MB gzipped).
6. **Voice on the collapsed-Location chrome.** Do we expose the mic from the collapsed view, or only when expanded? **My lean:** collapsed view shows the location button (current location) only; expanding reveals the mic. Officers will want voice but should see the field they're dictating into, for the confirmation chip.
7. **Subject address.** This research focused on the incident location. The same officer ergonomics arguably apply to the *subject's* address ("they live near 16th & Valencia"). My lean: out of scope for v1 — subject address is more often a literal residence than a known intersection. Revisit after launch.
8. **Tests.** No existing tests pin down cross-street behavior, which is freeing. We should add: validator tests for both modes, autocomplete-detection tests, a Transcribe-mock test that proves the fuzzy-matcher fixes the Junipero Sarah case.

---

## Part 6 — Risk register

| Risk                                                                                   | Likelihood | Impact | Mitigation                                                                   |
| ---                                                                                    | ---        | ---    | ---                                                                          |
| AWS forward intersection geocoding has poor SF coverage                                | Medium     | High   | Pre-flight bench test. If poor, swap primary to DataSF index.                |
| Custom Vocabulary doesn't materially improve "Junipero Serra" recognition              | High       | Medium | Phonetic fuzzy-match step is the actual fix; vocab is supporting.            |
| Officers don't discover the `&` / `and` convention                                     | Low        | Low    | Single-line hint under the field on first incident; help-tip icon.           |
| Existing data quietly relied on `addressLine1` always being set                        | Low        | Medium | Add a query check during migration; backfill enum to ADDRESS for all rows.   |
| Mantine uncontrolled-form gotcha re-bites us (memory note)                             | Medium     | Low    | Same defaults-vs-values pattern applies; reuse the pattern that worked.      |
| 5150 PDF expects addressLine1 (it does, for *subject* only — incident is unaffected)   | Low        | Low    | Behavior already in scope of Part 5 Q3.                                      |

---

## Part 7 — What's NOT in this proposal (deliberate omissions)

- **Multi-jurisdiction support.** SF-only per the scoping conversation. The pluggable seams (vocabulary source, intersection index, bounding box) are visible in the design but not built.
- **what3words.** Mentioned in the research as a real PSAP modality, but adds a third input type with marginal value over address+intersection for our user base. Defer.
- **LLM/Bedrock natural-language parsing** ("near 16th and the BART"). Promising future enhancement; not v1.
- **Refactoring address out of `Incident` into a polymorphic `Location` table.** Right long-term shape, wrong scope for this feature.
- **Subject/Facility address cross-street support.** v2 candidate.

---

End of initial investigation. See Part 8 for the bench-test follow-up that revised Part 4.

---

## Part 8 — Bench-test findings: AWS forward intersection geocoding for SF

Bench script: `server/scripts/bench-intersections.js`. Run via `node scripts/bench-intersections.js` from the server workspace.

### Method

- 30 SF intersections, hand-selected across 6 categories: major arterial (English), Mission/SoMa numbered grid, west-side avenues, Spanish-origin names, alley/minor streets, edge/weird (Panhandle, Lombard curvy block, etc.).
- 4 input format variations per intersection: `X & Y, San Francisco, CA`, `X and Y, San Francisco, CA`, `X St & Y St, San Francisco, CA` (suffix appended where bare), and `X & Y` (bare, no city).
- 2 AWS endpoints per query: `GeocodeCommand` and `AutocompleteCommand`. 240 queries total.
- Bias position: SF center. Bounding box: SF only.

### Results

**`AutocompleteCommand` could not be tested** — the `care-connect-location-dev` IAM user lacks `geo-places:Autocomplete` permission. Not blocking the architecture decision (see analysis), but noted as a known gap.

**`GeocodeCommand` returns *something* on 100% of queries.** That's the problem — the something is silently wrong on 27–73% of queries depending on format. Failure modes seen:

| Failure mode             | Example                                                                      |
| ---                      | ---                                                                          |
| Returns one street only  | `Maiden Lane & Grant, SF` → "Maiden Ln" (no intersection)                    |
| Reads numbered street as house number | `16th & Mission, SF` → "16 Mission St, SF 94105-1227" (~3 mi off) |
| Returns nearby POI       | `Market & Powell, SF` → "BART/MUNI - Powell Street Station, 899 Market St" |
| Returns wrong city       | `Lombard & Hyde, SF` with `&` → "Lombard district, American Canyon, CA"      |
| Returns wrong street     | `Bayshore St & Cortland St` → "Bayshore Fwy, South San Francisco"            |

**Intersection-typed hit rate by input format (across all 30):**

| Format                  | Intersection hits |
| ---                     | ---               |
| `X & Y, SF, CA`         | 8 / 30 (27%)      |
| `X and Y, SF, CA`       | 11 / 30 (37%)     |
| `X St & Y St, SF, CA`   | **22 / 30 (73%)** |
| `X & Y` (no city)       | 9 / 30 (30%)      |

**By category, using the best-case `withSuffix` format:**

| Category       | Intersection hits | Notes                                                                       |
| ---            | ---               | ---                                                                         |
| Mission/SoMa   | 5/5 (100%)        | The numbered-grid case. Suffix fix is decisive.                              |
| Arterial       | 3/5 (60%)         | Powell BART POI wins over Market & Powell; Geary/Masonic breaks when "St" appended (canonical is Blvd/Ave). |
| Spanish        | 4/5 (80%)         | Bayshore Blvd → "Bayshore St" breaks it. Junipero Serra works fine.          |
| Alley          | 4/5 (80%)         | Maiden Lane never resolves as intersection.                                  |
| Edge           | 4/5 (80%)         | Crestline & Twin Peaks Blvd never resolves (AWS has no node).                |
| West-side avenues | 2/5 (40%)      | Worst category. "California & 25th Ave" → "25 California St."                |

### Why 73% isn't a usable ceiling

1. **Silent failures are dangerous.** Officers see a plausible address; nothing flags that it's wrong. "16 Mission St" is several miles from the actual "16th & Mission." Lombard & Hyde → American Canyon is the canonical example.
2. **The 73% rate requires suffix normalization that AWS itself doesn't provide.** "St" only works for some streets. To get there we need a per-street canonical-suffix dictionary — which means we need DataSF anyway. At that point, doing the actual intersection lookup in DataSF instead of round-tripping to AWS is strictly simpler.
3. **The `&` vs `and` distinction is non-deterministic.** Lombard & Hyde fails with `&`, succeeds with `and`. We can't pick a single connector and trust it.
4. **Some categories are structurally broken.** West-side avenues (40%) and Crestline-type edge cases never resolve regardless of normalization. AWS doesn't model them.

### Architecture impact

The original Part 4 recommendation had AWS as primary intersection source with DataSF as fallback. **Revised:**

- **DataSF as primary.** Vendor a static intersection index (`ctsg-7znq` / `sw2d-qfup` from DataSF Socrata; ~10–15k entries, lat/lng-tagged, canonical street names + suffixes). Client-side typeahead matches directly. Zero AWS cost in the cross-street path. No silent failures — if the intersection isn't in the index, we surface "no match" honestly.
- **AWS Location stays on the traditional-address path only** — today's autocomplete behavior and reverse-geocoding from device location are unchanged.
- **No AWS Geocode for intersections at all.** Eliminates a class of silent geographic errors.

This is also simpler architecturally: no suffix-normalize-and-retry pipeline against AWS, no new IAM permission, no Storage-tier pricing concerns for AWS Geocode results, no cross-validation logic between two sources of truth.

### Remaining unknowns

1. **Does DataSF cover all 30 of our test intersections with sensible lat/lng?** Next step. If DataSF also misses Crestline / Twin Peaks Blvd, we have a bigger problem and may need to fall back to OSM-derived data for that long tail.
2. **Should AWS Autocomplete play a sanity-check role?** Open. We could enable the IAM permission later and add a non-blocking "AWS disagrees" warning. Park for now.
3. **What canonical name should we display?** DataSF data uses uppercase, suffix-included form ("MARKET ST", "VALENCIA ST", "JUNIPERO SERRA BLVD"). For display we'd title-case and may want to strip suffixes in compact contexts ("16th & Valencia") while preserving them in detail views ("16th St & Valencia St"). Format choice to nail down in implementation.

---

## Part 9 — Bench-test findings: DataSF coverage of SF intersections

Bench script: `server/scripts/bench-datasf-intersections.js`. No credentials needed — DataSF Socrata is open.

### Method

Same 30 intersections as Part 8. For each, query the **`jfxm-zeee`** dataset ("Intersections by Each Cross Street Permutation") via the Socrata SODA API:

```
https://data.sfgov.org/resource/jfxm-zeee.json?
  $where=starts_with(upper(street_name_1), 'X') AND starts_with(upper(street_name_2), 'Y')
```

Query both `(a, b)` and `(b, a)` orderings, dedupe by CNN. Total dataset size: **21,058 permutation rows** (~10–11k unique intersections).

### Normalization gotchas discovered

Per-intersection failures on the first pass revealed three normalization rules that any production implementation needs to handle:

1. **Long-form suffix expansion.** DataSF uses abbreviated suffixes: `LANE → LN`, `STREET → ST`, `AVENUE → AVE`, `BOULEVARD → BLVD`. User input may use either form. Map long forms to short before query.
2. **Leading "THE".** DataSF stores **"THE EMBARCADERO"** as the canonical name, not "EMBARCADERO". When user types "Embarcadero" we need to try both prefixes.
3. **Compound vs split spelling.** **"BAYSHORE"** is stored as **"BAY SHORE"** (two words) in DataSF. This is the kind of edge case that needs an explicit alias map; "Bayshore" → "Bay Shore" is a known SF-specific quirk.

Also discovered: DataSF zero-pads single-digit numbered streets (`3RD → 03RD`, `7TH → 07TH`). Predictable but needs the transformation.

### Schema reference (`jfxm-zeee`)

| Column           | Example          | Notes                            |
| ---              | ---              | ---                              |
| `id`             | `236753`         | Row ID                           |
| `cnn`            | `24183000`       | Centerline Network Number (SF canonical intersection ID) |
| `street_name_1`  | `16TH ST`        | Full name with suffix            |
| `street_name_2`  | `VALENCIA ST`    | Full name with suffix            |
| `latitude`       | `37.76491732…`   | Direct lat/lng — no separate geocode needed |
| `longitude`      | `-122.4218863…`  |                                  |
| `zip_code`       | `94103`          |                                  |
| `x_coord`, `y_coord` | …            | NAD83 / state plane; ignore      |

Every intersection appears twice in the table (A→B and B→A) — useful when joining, but in this query layer we dedupe on `cnn` to count one intersection once.

### Results (after normalization fix)

**28/30 exact match (93%) · 1 multi-candidate (both correct) · 1 genuine miss.**

| Category         | Coverage      | Notes                                                                  |
| ---              | ---           | ---                                                                    |
| Arterial         | 5/5           |                                                                        |
| Mission/SoMa     | 5/5           |                                                                        |
| West-side avenues | 5/5          | The category that AWS choked on. DataSF handles it cleanly.            |
| Spanish-origin   | 5/5           | After "THE" + "BAY SHORE" fixes. Junipero Serra resolves directly.     |
| Alley            | 5/5           |                                                                        |
| Edge             | 3/5 + 1 multi | Fell & Stanyan returns two adjacent nodes (FELL ST & FELL ACCESS RD). Crestline & Twin Peaks Blvd genuinely doesn't exist. |

### The one genuine miss

**Crestline & Twin Peaks Blvd**: DataSF shows Crestline Dr's intersections as Parkridge Dr, Burnett Ave, Vista Ln, and a dead end — *not* Twin Peaks Blvd. The two roads run near each other on Twin Peaks but appear not to share a node in the SF centerline graph. **My test case was wrong**, not DataSF's data. If officers ever report a location on Crestline near Twin Peaks Blvd, the typeahead would surface the actual Crestline intersections (Parkridge, Burnett, Vista) — which is the correct behavior. Reverse-geocoding the lat/lng to an address would still work as a fallback.

This is reassuring: **the data appears to be both complete and authoritative for actual SF intersections.**

### The one multi-candidate

**Fell & Stanyan** returns both "FELL ST & STANYAN ST" (37.77143, -122.45398) and "FELL ACCESS RD & STANYAN ST" (37.77193, -122.45408) — adjacent nodes ~50m apart at the Panhandle/Golden Gate Park entrance. This is genuinely ambiguous and **the right behavior is to surface both candidates in the typeahead** for the officer to pick. The UX must handle multi-candidate results gracefully.

### Implications for the implementation plan

1. **DataSF is the right primary source.** 93% exact + 3% multi-candidate (still correct) + 3% genuine geographic gap = effectively complete for SF.
2. **A small normalization layer is required** (suffix expansion, "THE" handling, "BAY SHORE" alias, zero-padding numbered streets). This is a single function, well-defined, easy to unit-test.
3. **Multi-candidate results are real and must be designed for.** ~3% of intersections in our test set returned 2+ valid nodes. The typeahead should not auto-pick.
4. **The "Crestline & Twin Peaks Blvd" type miss is actually the desired behavior** — officers won't type non-existent intersections. If they do, the typeahead saying "no match" is correct.
5. **Vendoring the data is realistic.** 21,058 permutation rows = ~10–11k unique intersections. At ~80 bytes per row (CNN + 2 street names + lat/lng), the full index is ~1.5–2 MB raw, comfortably <500 KB gzipped. Static JSON checked into the repo works fine.
6. **The `cnn` (Centerline Network Number) is a natural canonical key.** Worth storing alongside `street1`/`street2`/`lat`/`lng` on the Incident model — gives us a stable identifier that survives DataSF refresh, useful for de-duplication and downstream joins.

### Suggested schema addendum

Adding to the Part 4 storage recommendation: in addition to `street1`/`street2`/`locationType`, store the DataSF `cnn` when available:

```
locationType   enum('ADDRESS','INTERSECTION') DEFAULT 'ADDRESS'
street1        String?
street2        String?
intersectionId String?   -- DataSF CNN (e.g., "24183000"); nullable for free-text entries
```

If an officer enters a cross-street that isn't in our vendored index (the 3% case), `street1`/`street2`/`latitude`/`longitude` are still populated but `intersectionId` is null. Downstream consumers can branch on null-vs-present if they need a canonical reference.