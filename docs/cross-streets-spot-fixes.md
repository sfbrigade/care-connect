# Cross-Streets — Spot-Fix Log

Running log of in-the-weeds issues encountered while shipping the cross-streets
feature, with diagnosis and fix. Kept so we can spot recurring patterns and
decide if/when to revise the underlying strategy rather than continue
whack-a-mole.

Each entry: what was observed → what the root cause was → what we changed →
optional pattern tag.

Pattern tags emerging so far:
- `data-shape-assumption` — code that assumed the address-only shape and broke for intersection-mode records.
- `stt-fusion` — speech-to-text errors that collide tokens.
- `ranking-bug` — matcher returned candidates that didn't include the intended one inside the result limit.
- `ux-feedback` — affordance missing or feedback unclear.

---

## #1 — 422 on "Hold a chair"

**Observed:** Clicking "Hold a chair" failed with a server 422:
```
"errors": [
  {"path": "street1", "message": "Invalid input: expected string, received undefined"},
  {"path": "street2", "message": "Invalid input: expected string, received undefined"},
  {"path": "intersectionId", "message": "Invalid input: expected string, received undefined"}
]
```

**Diagnosis:** `client/src/lesc/components/Holds.jsx:40` defines `buildBlankIncident(facilityId)` which posts a fully-blank incident payload to `/api/incidents` for the "first hold of an incident" flow. After P2 added `locationType`/`street1`/`street2`/`intersectionId` to the schema, this helper still only set the *original* fields explicitly. The new fields went to the server as `undefined`. Zod's `.nullable()` accepts `string | null` but not `undefined` — hence 422.

**Decision (Option A vs B):** debated whether to loosen the schema (`.nullish()`) or keep schema strict and update the client payload-builder. Went with **B** to stay consistent with the existing convention in this codebase: server schema is strict, client lists every field explicitly. See conversation thread.

**Fix:** added `locationType: 'ADDRESS'`, `street1: null`, `street2: null`, `intersectionId: null` to `buildBlankIncident` (`client/src/lesc/components/Holds.jsx:40-58`). Reverted the temporary `.nullish()` change in `server/models/incident.js`.

**Pattern tag:** `data-shape-assumption`

**Notes:** This is the *only* other client-side payload builder for incidents I found (the other path is `IncidentForm.jsx:buildIncidentPayload`, which I already updated). If future fields get added, both builders need updating — worth considering a shared helper or default factory.

---

## #2 — Intersection-mode incidents always "details incomplete"

**Observed:** While auditing fix #1, realized that *if* an intersection-mode incident were created, every downstream gate (handoff, transfer, cancel, my-holds, arrived) would treat it as incomplete because `isIncidentDetailsComplete` checks `incident.addressLine1 && incident.city && incident.state`. None of those are set for intersection mode.

**Diagnosis:** `server/lib/incidentPermissions.js:22-33` and `server/lib/hospitalCancellation647f.js:32-42` both encode the same address-only completeness check.

**Fix:** extracted a `isIncidentLocationComplete(incident)` helper in `incidentPermissions.js` that branches on `locationType`. INTERSECTION mode needs `street1 && street2`; ADDRESS mode keeps the original check. Both call sites updated.

**Pattern tag:** `data-shape-assumption`

**Notes:** This was the same shape of bug as #1 (downstream code didn't know about the discriminator) but in a different layer. Worth watching: if we find a third such case in unrelated code, the right move may be a typed "is this an incident with a usable location?" helper that becomes the single source of truth, rather than reimplementing the branch each time.

---

## #3 — Arrests report & 849b PDF would show blank location for intersection-mode

**Observed:** While auditing for #2, found two more places with the same address-only assumption:
- `server/routes/api/arrests.js` — Prisma `select { addressLine1, city, state }`, then `streetCityState(i)` for the response `address` field.
- `server/lib/forms/849b/generate.js:62` — `arrestLocation = [addressLine1, city, state].filter(...).join(', ')` for the SFSO PDF.

**Diagnosis:** Same pattern as #2 — code that assumes the address shape.

**Fix:** added `incidentLocationText(incident)` helper in `server/lib/forms/shared/formUtils.js` that branches on `locationType`. Added `locationType`/`street1`/`street2` to the arrests-route Prisma select. Both call sites now call the new helper. Per the Q3 decision in `cross-streets.md`, intersection-mode incidents render as e.g. "16th St & Valencia St" with city/state appended.

**Pattern tag:** `data-shape-assumption`

**Notes:** Three address-shape bugs in a row (#1, #2, #3). If we find one more, I'd argue for a single canonical "render an incident's location text" helper used everywhere, and a typed read-side wrapper that surfaces the discriminator. For now, deliberately leaving the per-call branching since the call sites are few.

---

## #4 — Confirmation chip never appeared after a successful voice match  *(later reverted in #9)*

**Observed:** User reported: "I don't see a chip anywhere after I successfully enter an intersection."

**Diagnosis:** Mid-implementation I'd added a "if exactly 1 match, auto-fill and skip the chip" optimization in `IncidentForm.jsx:handleVoiceResult`. For the *common* case (e.g. "16th and Valencia" → 1 clean match), this meant zero feedback that voice was processed — the field silently updated.

**Fix:** removed the shortcut. Chip always shows when there's at least one match. Tightened the wording: single match reads "Tap to confirm:", multi reads "Did you mean:" (`client/src/components/LocationVoiceButton.jsx:LocationConfirmationChip`).

**Pattern tag:** `ux-feedback`

**Notes:** **This change was reversed in #9 once the user tried it in practice.** See #9 for the final state. The lesson here is in the spread between *theory* (CAD-style verification is the cautious default) and *use* (one extra tap on the happy path felt like friction, and the field updating *is* feedback).

---

## #5 — Mic disappeared in expanded view

**Observed:** User reported the mic was visible on the collapsed location field but vanished when the field expanded into the address form. No way to use voice once expanded.

**Diagnosis:** The expanded view's `LocationAutocomplete` only had `<LocationButton />` (current-location icon) in its `rightSection`. The mic was only wired up on the collapsed view.

**Fix:** mirrored the same `<Group gap={4}><LocationVoiceButton/><LocationButton/></Group>` into the expanded view's `rightSection`, plus rendered the confirmation chip in both layouts.

**Pattern tag:** `ux-feedback`

**Notes:** Worth a UX sweep when voice support extends to other fields — if we add voice to a new field, both states (collapsed/expanded, narrative/edit, etc.) need the affordance, not just the default one.

---

## #6 — "Mission Street" couldn't match in the typeahead/voice path

**Observed:** Voice path returned "Couldn't match those streets" for "14th Street and Mission Street" — even though both streets clearly exist and the parser split correctly.

**Diagnosis:** `findStreetCandidates('Mission Street')` returned the first 5 streets starting with prefix "MISSION" sorted alphabetically:
```
MISSION BAY BLVD NORTH
MISSION BAY BLVD SOUTH
MISSION BAY CIR
MISSION BAY DR
MISSION CREEK
```
`MISSION ST` was alphabetically further down and got cut off. The intersection-lookup step then had no `MISSION ST` candidate to pair with `14TH ST`. Same risk for any common street name that has compound-name neighbors.

**Fix:** added `rankedStreetCandidates()` in `server/lib/intersections.js`. Fetches a larger candidate pool, then ranks: streets whose `base` *exactly equals* one of the input's prefix candidates come first, then by base length ascending. So `MISSION ST` (base = "MISSION") now ranks ahead of `MISSION BAY BLVD ...` (base = full compound). Applied to both the typed path (`search`) and the voice path (`findStreetCandidates`).

**Pattern tag:** `ranking-bug`

**Notes:** This kind of bug is invisible in single-street-name tests — only surfaces when a real intersection lookup hits a popular base name with many compound siblings. **Worth adding integration tests** for the popular cases (Mission, Market, Geary, Van Ness — streets that have lots of named neighbors).

---

## #7 — "14th admission" — STT fusion of "and Mission"

**Observed:** User said "14th and Mission" → Transcribe heard "14th admission" → parser found no connector → chip said "Didn't sound like a cross-street."

**Diagnosis:** AWS Transcribe is collapsing the bigram "and Mission" into the single token "admission" because they're phonetically near-identical (`/ænd ˈmɪʃən/` ≈ `/ædˈmɪʃən/`). Worst case among SF streets because the fusion produces a real English word — Transcribe's language model prefers "admission" over the unusual "and Mission."

**Fix:** added `parseOrRecover()` in `server/lib/intersections.js`. When the direct connector parse fails, for each token try peeling a 1–3 char connector-like prefix (`AD`, `AND`, `AN`, `AT`, `N`); if the remainder is a known SF street base, split there. "14th admission" → token "admission" → peel "ad" → "mission" is in the street list → split as side1="14th", side2="MISSION". Wired into the typed `search` and the transcribe-route location-mode handler. Conservative — only triggers if the remainder is a *known* street base, so random words like "addiction"/"addition" don't false-positive.

**Pattern tag:** `stt-fusion`

**Notes (potential pattern → strategy revision):** This is the first STT-specific fusion fix. If more such cases pile up, the right strategy revision is probably **switching the location path to Deepgram Nova-3 with Keyterm Prompting** (per the Part 7 escalation rule in `cross-streets-implementation-plan.md`). Specifically, the threshold to revisit: if voice accept rate drops below ~80% in a measurable sample and the failures are dominated by proper-noun fusion, that's the cue. We don't have measurement yet — adding it is in Phase 7. Until then, the `parseOrRecover` recovery is a stopgap that covers the most common case (vowel-starting major streets after "and").

Other STT-fusion cases I'd watch for next:
- "X and Octavia" → ?
- "X at Irving" → ?
- "X and Owens" → ?
- "Howard and Sixth" → "Howard inserts" or similar
- "X & Y" said as "X 'n Y" → ?

---

## #8 — "Third & Folsom" → "Third and fulsome" — ordinal word + Folsom misheard

**Observed:** Voice "Third & Folsom" came through as `"Third and fulsome"`. The chip showed "Couldn't match those streets."

**Diagnosis:** Two independent issues in one transcript:
1. AWS Transcribe outputs the English word "Third" (not "3rd"). The lookup couldn't bridge it to the DataSF canonical `03RD ST` — the digit-prefixed name has no meaningful phonetic encoding (Double Metaphone treats `0`/`3` as silent). So side1 failed with no candidates.
2. "Folsom" was heard as "fulsome" — but this side actually *would* have worked, because phonetic match catches it (`FLSM ↔ FLSM`, score 0.89). The failure was attributable entirely to side1.

**Fix:** added `expandOrdinalWords()` in `server/lib/streetNormalization.js` mapping `First/Second/Third/.../Thirtieth` and compound ordinals (`Twenty-First`, `Twenty Fourth`) to their digit forms (`1ST/2ND/3RD/.../30TH/21ST/24TH`). Hooked into `toPrefixes` as the first step, so the existing zero-pad regex (`3RD → 03RD`) catches it next. Result: `findStreetCandidates('Third')` now returns `['03RD AVE', '03RD ST', '03RD TI ST']`. End-to-end: `"Third and fulsome"` → `3rd St & Folsom St`.

Tests added for ordinal expansion (`expandOrdinalWords`) and ordinal-aware `toPrefixes`.

**Pattern tag:** `stt-fusion` (specifically a "wrong-form transcription" subtype — the word is correctly recognized but in a form the lookup can't bridge)

**Notes:** This was actually two latent bugs in one transcript, and only the visible side (Third) was blocking. The Folsom→fulsome part already worked via phonetic fallback — quiet confirmation that the matcher pipeline does handle vowel-shift cases when the prefix layer fails. Good sign for the strategy: phonetic fallback is doing real work, just gated by digit-vs-word in this case.

**Strategy implication:** SF's numbered streets/avenues are everywhere. This won't be a one-off — *any* voice input that names a numbered street as a word ("Twenty Fourth and Mission", "Nineteenth and Taraval") would have failed before this fix. Worth verifying with usage data that the ordinal map covers what officers actually say.

---

## #9 — Reverted #4: single-match voice should auto-apply silently

**Observed:** After using the always-show-chip behavior from #4 in practice, the user said:
> "I don't like the 'show a confirmation, then user taps to confirm'. I don't mind the other panel (when we can't match the voice to something, we at least display what we heard, and encourage the user to type it in). But I find that when the system is able to transcribe my audio to a real intersection, I don't want a separate tap, I just want it to populate the field."

**Diagnosis:** The chip's value is genuine on multi-match (real ambiguity that needs a choice) and no-match (failure mode that needs explanation + the raw transcript). On a clean single match, the field itself updating is sufficient feedback — adding a confirmation tap on the *happy path* is friction without value.

**Fix:** restored the single-match auto-apply shortcut in `IncidentForm.jsx:handleVoiceResult`. New three-way logic:
- **1 match** → `applyIntersectionMatch(matches[0])`, clear `voiceResult` (no chip)
- **2+ matches** → `setVoiceResult(data)` so the chip shows the picker
- **0 matches / unparseable** → `setVoiceResult(data)` so the chip shows the "couldn't match" hint with the raw transcript

**Pattern tag:** `ux-feedback`

**Notes:** This is a meta-lesson about my earlier reasoning in #4. I framed the chip as protecting "evidence integrity," but in practice the verification CAD systems do is for *dispatchers* coordinating with field officers over radio — different context. For a field officer self-entering, the field's own value display is the verification. Default to the lighter UX; add friction only where ambiguity or failure genuinely requires it.

The previous chip wording change ("Tap to confirm:" vs "Did you mean:") stays — it's still relevant for the multi-match case the chip *does* render in. Single match just doesn't render the chip at all anymore.

---

## Pattern summary so far

- **`data-shape-assumption`** (3 occurrences): #1, #2, #3. Each was a code path that assumed address-only and didn't know about the locationType discriminator. **If another shows up, lean on a typed read-side wrapper** (e.g. `getIncidentLocation(incident) → { type: 'address'|'intersection', text, lat, lng }`) and migrate call sites to it rather than continuing inline branching.
- **`ranking-bug`** (1 occurrence): #6. Test coverage gap — popular base names with compound siblings need integration tests.
- **`stt-fusion`** (2 occurrences): #7, #8. Both handled with focused fixes in the normalization/recovery pipeline. **If 3+ more such fixes pile up, escalate the STT strategy** to Deepgram Nova-3 per the implementation plan's Part 7 gate. #8 in particular suggests a more general principle: anywhere a canonical name has a non-phonetic transformation from speech (digits ↔ words, abbreviations, leading "THE"), we need explicit normalization — phonetic match alone won't bridge it.
- **`ux-feedback`** (3 occurrences): #4, #5, #9. #5 was a genuine miss. #4 + #9 together form one back-and-forth: I built the cautious-by-default UX, the user tried it and preferred the lighter one. Lesson: when defaulting cautious vs. light on a UX call where I'm guessing, prefer light + escalate friction only where ambiguity/failure requires it — and surface the choice early instead of letting it ship and bounce.

---

## Strategy reconsiderations parked for later

(These are *not* changes to make now — they're flagged for revisit once the running log shows enough signal to act.)

- **Single source-of-truth read wrapper for incident location.** Promote `incidentLocationText` and friends into a typed helper that all consumers (server formatters, completeness checks, PDFs, list responses) use. Currently they each branch on `locationType` themselves. If we collect a 4th `data-shape-assumption` entry, do this.
- **Switch location path STT to Deepgram Nova-3.** Currently using AWS Transcribe (shared with the narrative path). If we collect 3+ `stt-fusion` entries OR get measurement showing <80% voice accept rate on locations, escalate.
- **Integration test fixture for popular base-name lookups.** Add tests for "& Mission", "& Market", "& Geary", "& Van Ness", "& Castro" — all streets with many compound siblings.
