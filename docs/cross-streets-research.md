# Cross-Streets Location Input: External Research Report

**Audience:** Care Connect design team
**Purpose:** Inform the design doc for adding cross-street ("16th & Valencia") location entry to the field-officer incident report flow.
**Scope:** External research only — no Care Connect code changes proposed here.

---

## TL;DR

1. **Intersection geocoding is a first-class concept across the major CAD/911 vendors and consumer maps.** The de-facto entry convention is `Street1 & Street2` (or `Street1 and Street2`). Google Maps, Mapbox, Apple Maps, Uber, Lyft, Mark43, PremierOne, Hexagon, Tyler all support this, but the geographic coverage and exact behavior differ.
2. **AWS Location Service's forward `Geocode` and `Autocomplete` APIs *do* accept intersection input — but the documented "intersections" capability is reverse-geocoding-centric.** The response schema has a first-class `Intersection: [string]` array and `PlaceType: "Intersection"`, and the `AdditionalFeatures: ["Intersections"]` flag on `ReverseGeocode` is the way to get "nearest intersection" lookups. Forward intersection support in AWS Location v2 is real but underdocumented; expect to validate with empirical SF testing before committing.
3. **DataSF has authoritative, free, lat/lng-indexed lists of every SF street, intersection, and centerline node.** This is the strongest fallback if AWS intersection coverage is patchy in SF. (`pu5n-qu5c`, `ctsg-7znq`, `sw2d-qfup`, `3psu-pn9h`.)
4. **For STT, the right combination is: AWS Transcribe Custom Vocabulary (with display forms) + alternative transcriptions (n-best up to 10) + post-hoc fuzzy/phonetic matching against an SF street name dictionary.** Custom vocabulary alone won't fix "Junipero Sarah" because IPA/SoundsLike pronunciation hints are no longer honored in non-medical custom vocabulary. The fix is **n-best + Double-Metaphone fuzzy match against the SF street list.**
5. **If voice accuracy on proper-noun street names becomes a recurring blocker, Deepgram Nova-3 "Keyterm Prompting"** (up to 100 terms, advertised 90% keyword-recall improvement, preserves casing) **is materially stronger than AWS Transcribe custom vocabulary** for biasing recognition toward a fixed lexicon.
6. **Detecting intersection-vs-address input is trivially regexable on the client** (the presence of `&`, `/`, `@`, or the word `and`/`at` between two non-numeric tokens is enough to flip into intersection mode). NENA and ArcGIS treat `& | @ \` (and `and`/`at`) as the canonical connectors.
7. **Surprising finding:** Apple/Google use intersections silently for *driver privacy*, not officer ergonomics — but the underlying UX (single text field, mode auto-detected from connector token) is exactly what officers want. We should copy that pattern.

---

## 1. How other applications handle cross-streets vs addresses

### 1.1 Computer-Aided Dispatch (CAD) and RMS vendors

CAD systems have treated cross-streets as a first-class location type for decades. Industry best-practice documents (e.g., Billerica PD CAD SOP) explicitly require an intersection to be entered in the **street name field** in the form `BOSTON & COOK` — with **no street suffix abbreviations** (no `RD`, `ST`, `AV`) when in intersection mode. The system then validates the intersection against its centerline GIS, snaps to the nearest node, and may auto-append the *next* nearest cross street as a confirming detail to the dispatcher.

Sources:
- [BJA / LEITSC — Law Enforcement CAD Systems Functional Specification](https://bja.ojp.gov/sites/g/files/xyckuh186/files/media/document/leitsc_law_enforcement_cad_systems.pdf) — describes intersection validation, address ranges, and X/Y/Z translation as core CAD functions.
- [Billerica Police Department — COM-05 CAD SOP](https://public.powerdms.com/BillericaPD/documents/1846604) — concrete formatting rules ("`BOSTON & COOK`", drop suffixes for intersections).

**Vendor-by-vendor:**

| Vendor | Intersection support | Notes |
| --- | --- | --- |
| Mark43 CAD | Yes, via Esri-based location entry and what3words integration. | Marketed around "pinpoint exact locations" with Esri partnership; also integrates RapidSOS for verified caller coordinates. ([Mark43 CAD overview](https://mark43.com/platform/cad/)) |
| Motorola PremierOne | Yes — built on a "location-based, GIS-data map." | Optimized for multi-agency PSAPs; intersection and common-place-name lookup are baseline features. ([Motorola PremierOne CAD User Guide](https://www.motorolasolutions.com/content/dam/msi/docs/support/manuals/CAD6_7_8UserGuide.pdf)) |
| Hexagon Intergraph I/CAD | Yes — integrated mapping/dispatch with intersection lookup; what3words integration available. ([Hexagon OnCall what3words integration](https://what3words.com/business/emergency)) |
| Tyler New World CAD | Yes — NCIC/RMS lookups and mobile CAD support intersection entry. ([Tyler / FirstArriving integration article](https://support.firstarriving.com/support/solutions/articles/36000485333-tyler-technologies-new-world-cad)) |
| TriTech / CentralSquare | Yes — long-standing intersection geocoding via local centerline. (Industry standard, no single linkable doc found in this research pass.) |
| RapidSOS UNITE | "GIS module automatically uses your agency's local geocoder first for address search, **cross streets**, and common place names." ([RapidSOS GIS Mapping](https://rapidsos.com/public-safety/gis-mapping/)) |

**RMS systems** (Versaterm, Caliber, Axon, ARMS, Omnigo) typically receive location data via CAD-to-RMS hand-off, so the intersection format originates in CAD. ([Axon — Complete Guide to Police RMS](https://www.axon.com/resources/police-rms), [ARMS RMS](https://arms.com/products/rms/))

### 1.2 Ride-share apps

Both Uber and Lyft support intersection input in the same text box as addresses, with the explicit UX goal of protecting rider home addresses. From [Engadget — "Shield your address from Uber by using cross streets"](https://www.engadget.com/2017-04-13-uber-cross-streets-for-pickup-and-dropoff.html):

> "Both Uber and Lyft now allow users to enter two cross streets when typing in a destination or pickup location."

Lyft's mapping is powered by Google Maps, which is why intersection support arrived there first. Uber explicitly added it at user request. The interesting engineering insight from Uber: **"a rider's pin may drop in the middle of the street, creating confusion about which side the rider is on"** — i.e., intersection pinpoints are slightly ambiguous about the corner ([Uber Newsroom — pickup experience](https://www.uber.com/newsroom/smooth-pickup-experience/)). For incident reporting this matters less, but worth noting.

### 1.3 Consumer maps

| Service | Intersection input | Notes |
| --- | --- | --- |
| **Google Maps** | Yes. Format `Street A & Street B, City` returns a coordinate. The Geocoding API documents a `RANGE_INTERPOLATED` `location_type` for interpolated points between intersections. | "Google Maps is aware of street intersections in the US. The geocoder does not currently know any countries outside the US that use street intersections as addresses." ([Google Groups: Geocoding street intersections](https://groups.google.com/g/google-maps-api-web-services/c/UhvCp2yyx-M); [Geocoding requests/responses](https://developers.google.com/maps/documentation/geocoding/requests-geocoding)) Doesn't handle complex constructions like "Between Pine St and Church St" or "SW Corner of Main & Elm." |
| **Apple Maps / MapKit** | Yes in the consumer Maps app (the typed search box accepts "Market and Castro"). MapKit's `MKLocalSearch` / `MKLocalSearchCompleter` will return intersection POIs. ([Apple Community: intersection search](https://discussions.apple.com/thread/7666887); [MapKit](https://developer.apple.com/documentation/mapkit/)) No first-class `placemark.kind == intersection` type, but the search completer surfaces them. |
| **Waze** | Yes in the search box; Waze's data model is OSM-derived. ([Waze community thread](https://support.google.com/waze/thread/126493485/is-there-a-way-to-key-in-an-intersection-of-two-roads?hl=en)) |
| **Mapbox** | Yes — Geocoding v5/v6 supports "intersection search" with `and` or `&` between street names. *"Intersection search is not available in all countries."* ([Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding-v5/), [Mapbox Help](https://docs.mapbox.com/help/getting-started/geocoding/)) Mapbox also published (now deprecated) [`cross-street-indexer`](https://github.com/mapbox/cross-street-indexer) — a tile-based geocoder specifically for OSM intersections; useful as a reference architecture. |

### 1.4 Established UX patterns for "address or intersection"

The dominant pattern across all consumer/CAD systems is a **single free-text field with auto-detection**, not a mode toggle:

- User types `16th and Valencia` → suggestion list switches to intersection-typed suggestions.
- User types `425 16th St` → suggestion list returns point addresses.
- The connector tokens (`&`, `and`, `/`, `@`) are the trigger.

Esri's ArcGIS geocoder formalizes this: **"By default, the symbols `&`, `|`, `@`, and `\` are recognized as intersection connectors,"** plus locale-specific words like `and` and `at` in the US ([Esri docs](https://doc.esri.com/en/arcgis-pro/latest/help/data/geocoding/fundamentals-of-intersection-geocoding.html)).

CAD systems are slightly different — they tend to expose an explicit "intersection" choice in the address-type radio button, because dispatchers also need other types (mile-marker, common-place name, lat/long). For a **field-officer** app, the consumer pattern (no toggle, infer from input) is closer to what officers want.

---

## 2. AWS Location Service — what's actually supported

### 2.1 Endpoint landscape (v2 / `geo-places`)

The v2 Places APIs are split into the following relevant endpoints ([Places APIs overview](https://docs.aws.amazon.com/location/latest/developerguide/places-choose-api.html)):

| Endpoint | What it does | Intersection-relevant? |
| --- | --- | --- |
| `Geocode` | Forward geocoding: free-text or structured → lat/lng + components. | **Yes** — `QueryText` accepts intersection strings; response includes `Address.Intersection: [string]` and `MatchScores.Components.Address.Intersection`. |
| `ReverseGeocode` | lat/lng → address. Supports `AdditionalFeatures: ["Intersections"]` to return nearby intersections with `Heading` and street-type filters. | **Yes — this is the best-documented path.** |
| `Autocomplete` | Typeahead suggestions from partial input. | **Yes** — response carries `Address.Intersection: [string]` and `PlaceType: "Intersection"` is a valid result type. |
| `Suggest` | Like Autocomplete but returns search-term suggestions (cheaper). | Yes for the response shape, similar to Autocomplete. |
| `SearchText` | Text query for places/POIs. | Less suited to intersections; biased toward POIs. |
| `SearchNearby` | Radius search around a point. | N/A. |
| `GetPlace` | Detail lookup by `PlaceId`. | Used to expand an intersection PlaceId into full coordinates. |

Reference: [Places choose-api table](https://docs.aws.amazon.com/location/latest/developerguide/places-choose-api.html).

### 2.2 Forward-geocoding an intersection

The `Geocode` API ([API reference](https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_Geocode.html)) accepts:

```json
{
  "QueryText": "16th and Valencia, San Francisco, CA",
  "BiasPosition": [-122.4194, 37.7749]
}
```

The response shape includes:

```json
{
  "ResultItems": [{
    "PlaceType": "Intersection",        // <-- valid value
    "Address": {
      "Intersection": ["16th St", "Valencia St"],
      "Label": "16th St & Valencia St, San Francisco, CA, USA",
      ...
    },
    "Position": [-122.4214, 37.7651],
    "MatchScores": {
      "Components": {
        "Address": { "Intersection": [0.98, 0.99] }
      }
    }
  }]
}
```

Notes:
- `Address.Intersection` is documented as `array of strings` in every relevant Places type (Geocode, Autocomplete, ReverseGeocode result items).
- `MatchScores.Components.Address.Intersection` is an array of per-street confidence scores — useful for ranking ambiguous matches.
- The `ParsedQuery.Address.Street` array exposes what the parser identified, which is useful for showing "we read this as: 16th St + Valencia St" UI confirmation.

**Caveat:** the AWS documentation centers intersection examples around `ReverseGeocode + AdditionalFeatures: ["Intersections"]`. The forward path is implicit ("the API supports flexible queries, including free-form text"), and there is no AWS-published example of `QueryText = "16th & Valencia"`. **Plan to verify empirically in SF before relying on it.**

### 2.3 Reverse-geocoding to the nearest intersection

This is **explicitly documented** ([How to get intersections](https://docs.aws.amazon.com/location/latest/developerguide/reverse-how-to-get-intersections.html)):

```json
POST /v2/reverse-geocode
{
  "QueryPosition": [-122.4214, 37.7651],
  "AdditionalFeatures": ["Intersections"],
  "Heading": 45,                           // optional, for directional bias
  "Filter": { "IncludePlaceTypes": ["Street"] }
}
```

Response includes a top-level `Intersections: [...]` array per `ResultItem`, each with `PlaceId`, `Position`, `Distance`, and `Address.Intersection: [street1, street2]`. AWS specifically calls out **"emergency services and delivery couriers"** as the target use case for this endpoint.

This makes a great Care Connect feature in itself: from a captured GPS fix, propose `Address: 425 16th St` AND `Nearest intersection: 16th St & Valencia St` so the officer can pick whichever is operationally clearer.

### 2.4 Data providers

AWS Location v2 has unified onto Esri + HERE + Grab + OpenData under the hood, but the provider is no longer surfaced per-place-index in v2 as it was in v1 ([v1 data-provider features](https://docs.aws.amazon.com/location/previous/developerguide/data-provider-features.html)). Provider differences known from v1 docs:

- **Esri**: Best US street coverage, returns unit information.
- **HERE**: Returns time-zone info; strong globally.
- **Grab**: Southeast Asia only.

Esri is the historical workhorse for US intersection data, and ArcGIS's intersection-geocoding code path is mature ([Esri intersection geocoding](https://doc.esri.com/en/arcgis-pro/latest/help/data/geocoding/fundamentals-of-intersection-geocoding.html)). Since AWS Location v2 packages Esri data, intersection support should be reasonable for SF, but we should still **bench-test against a sample of SF intersections** (especially weird ones: Junipero Serra & Monterey, Geary & Masonic, the Panhandle).

### 2.5 Storage / pricing gotcha

The `Geocode` API's `IntendedUse` defaults to `SingleUse`. **If we want to persist the resolved coordinates on the incident record, we must set `IntendedUse: "Storage"`**, which is charged at a higher rate ([Geocode API ref](https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_Geocode.html)). Autocomplete results **cannot be stored at all** in v2. Practical pattern: use Autocomplete for typeahead UI, then re-Geocode (with `IntendedUse: Storage`) on the final selection to persist.

---

## 3. Alternative geocoding sources for SF intersections

### 3.1 DataSF (recommended fallback / local cache)

DataSF publishes multiple closely-related datasets via Socrata. All are free, JSON via SODA API, no key required for low-volume use.

| Dataset | ID | What it is |
| --- | --- | --- |
| [Street Intersections](https://data.sfgov.org/Geographic-Locations-and-Boundaries/Street-Intersections/ctsg-7znq/data) | `ctsg-7znq` | One row per (intersection × street) — multiple rows per intersection node, one per intersecting street. Includes CNN (Centerline Network Number). |
| [List of Streets and Intersections](https://data.sfgov.org/Geographic-Locations-and-Boundaries/List-of-Streets-and-Intersections/pu5n-qu5c/data) | `pu5n-qu5c` | Combined list of segments + intersections, sorted by street name and ascending address number. |
| [List of Intersections only](https://data.sfgov.org/Geographic-Locations-and-Boundaries/List-of-Intersections-only/sw2d-qfup/data) | `sw2d-qfup` | Just intersections, sorted by street name. |
| [Streets — Active and Retired](https://data.sfgov.org/Geographic-Locations-and-Boundaries/Streets-Active-and-Retired/3psu-pn9h) | `3psu-pn9h` | Authoritative street name list, including aliases and historical names. |
| [Street Centerlines and Nodes (handbook entry)](https://datasf.gitbook.io/draft-publishing-standards/standard-reference-data/basemap/street-centerlines-nodes) | n/a | Documents how SF models the centerline graph. |

Architectural angle: we could **vendor a static `streets.json` + `intersections.json`** into the client (or server) at build time. For SF this is small — on the order of ~10k–15k intersections and ~2k unique street names — and gives us:

- A canonical, complete street-name dictionary for AWS Transcribe custom vocabulary.
- A canonical intersection list for client-side autocomplete with zero API latency / cost.
- The lat/lng of every intersection node for direct pin placement.
- A safety net for AWS Location v2 misses.

DataSF base portal: [data.sfgov.org](https://www.sf.gov/understanding-san-franciscos-street-level-data). Socrata API docs: [dev.socrata.com](https://dev.socrata.com/).

### 3.2 OpenStreetMap / Nominatim / Photon

- **Nominatim** has [poor intersection support](https://github.com/osm-search/Nominatim/issues/123). Long-standing open issue: searching `Street1, Street2` returns no result. Several community workarounds exist but none are robust.
- **Photon** (Komoot) inherits OSM data and the same limitation; no first-class intersection-search documented.
- **OSM Overpass API** can return intersection nodes by querying `node[highway=intersection]` or by intersecting `way` geometries, but this is a low-level GIS query, not a user-facing geocoder.
- **R-bloggers walkthrough** ([Geocoding An Intersection with OSM data](https://www.r-bloggers.com/2020/08/geocoding-an-intersection-with-open-street-map-data/)) shows manual approach.

**Verdict:** OSM-based geocoding is **not a good direct backend for intersection input.** Useful only as a data source for a custom-built intersection index (similar to how Mapbox built `cross-street-indexer`).

### 3.3 Google Maps

- Native intersection support in Geocoding API ([requests-geocoding docs](https://developers.google.com/maps/documentation/geocoding/requests-geocoding)).
- Pricing: ~$5.00 per 1,000 requests under Essentials SKU, with 10,000 free events/month ([Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)).
- Limitations: US-only intersection awareness, can't parse natural-language modifiers ("end of Main St", "SW corner of…").
- Practical issue for Care Connect: ToS-restricted (can't be cached/stored persistently without a license tier upgrade — same general issue as AWS `IntendedUse`).

### 3.4 Mapbox

- Intersection search available in [Geocoding v5/v6](https://docs.mapbox.com/api/search/geocoding-v5/) with `and` or `&` syntax.
- Country availability is restricted but **the US is supported**.
- Pricing competitive with Google.
- Deprecated [`cross-street-indexer`](https://github.com/mapbox/cross-street-indexer) is a reference for building an OSM-derived intersection index.

### 3.5 Canonical "list of SF intersections" — yes, it exists

DataSF's `ctsg-7znq` + `pu5n-qu5c` + `sw2d-qfup` collectively constitute that canonical list, free, lat/lng-tagged. **This is the strongest argument for a vendored local index.**

---

## 4. Voice STT for street names — accuracy techniques

### 4.1 The problem, restated

User dictates `Junipero Serra and Monterey` → AWS Transcribe outputs `Junipero Sarah and Monterey` → exact-string geocoder lookup fails → officer sees "no match" and reverts to manual entry.

The fix is one (or a combination) of:
1. Bias the recognizer toward `Junipero Serra` (and the rest of SF's ~2,000 street names) ahead of time.
2. Generate n-best alternatives and pick the one that geocodes.
3. Fuzzy/phonetic match the literal transcript against a known SF street dictionary post-hoc.

In practice, (1) + (3) combined is the industry pattern.

### 4.2 AWS Transcribe options

**Custom Vocabulary** ([Custom vocabularies docs](https://docs.aws.amazon.com/transcribe/latest/dg/custom-vocabulary.html)):

- Designed exactly for "domain-specific terms, brand names, acronyms, proper nouns" — street names are textbook examples.
- Supports a `DisplayAs` column so you can normalize the rendered string (e.g., recognize "saint francis" → write `St Francis`).
- **Important and not in the user's memory yet**: the `IPA` and `SoundsLike` pronunciation-hint columns are **no longer honored** in non-medical custom vocabulary tables — values are ignored ([AWS docs note](https://docs.aws.amazon.com/transcribe/latest/dg/custom-vocabulary.html)). This is the single biggest gotcha. Pronunciation control survives only in AWS Transcribe Medical.
- 300-word soft limit per vocabulary for best results; for ~2k SF streets, split into a small set of focused vocabularies (downtown, Sunset, etc.) or accept the larger vocabulary's diminishing returns.

**Custom Language Model (CLM)** ([Custom language models](https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html)):

- Captures *context* (e.g., "officer responding to a call at...") rather than individual word recognition.
- Requires training data and meaningfully more setup.
- Verdict: **overkill for street names alone**; revisit if Care Connect ends up dictating full narratives with consistent radio-style language.

**Alternative Transcriptions (n-best)** ([Alternative transcriptions](https://docs.aws.amazon.com/transcribe/latest/dg/alternatives.html)):

- `ShowAlternatives=true, MaxAlternatives=N` (1–10). Returns N transcripts per segment with confidence scores.
- **Batch only**, not streaming. (If we want streaming, this technique is unavailable in Transcribe.)
- Combined with fuzzy match: try alt 1 against the street dictionary; if no match within distance threshold, try alt 2, etc.

**Vocabulary Filtering**: not relevant here (it's for redaction).

### 4.3 Cross-vendor comparison for "bias toward a known lexicon"

| Vendor / feature | Mechanism | Limit | Strength for street names |
| --- | --- | --- | --- |
| **AWS Transcribe Custom Vocabulary** | Pre-built named resource, `Phrase` + `DisplayAs`. | ~300 words recommended; no pronunciation hints (non-medical). | Decent — but no way to teach `Junipero` = `hoo-NEE-pear-o` for the standard model. |
| **Deepgram Keywords (Nova-2/Enhanced/Base)** | Per-request `keywords=TERM:INTENSIFIER`, runtime, no pre-step. | 100 keywords per request; single-word only. | Good for typeahead-feel use cases. |
| **Deepgram Keyterm Prompting (Nova-3 / Flux)** | Per-request, in-context learning at inference time. | Up to 100 terms; multi-word supported; preserves capitalization & formatting. | **Strongest in class.** Deepgram quotes up to 90% improvement in keyword-recall rate; one customer reported 625% improvement on veterinary terms after switching from Nova-2 keywords → Nova-3 keyterms. Multilingual variant supports Spanish street names. ([Deepgram Keyterm Prompting](https://developers.deepgram.com/docs/keyterm); [Deepgram blog](https://deepgram.com/learn/deepgram-expands-nova-3-with-10-new-languages-and-multilingual-keyterm-prompting)) |
| **Google Cloud Speech-to-Text — Model Adaptation / Speech Context** | `phrases` (up to 5,000) with `boost`; supports `Class Tokens` like `$ADDRESSNUM`. | 5k phrases, 125+ languages. | Strong, and the **only one with a built-in `$ADDRESSNUM` / address class token**. Worth a real bake-off if AWS doesn't get us there. ([Google STT speech adaptation](https://cloud.google.com/speech-to-text/docs/adaptation-model)) |
| **Azure Speech — Custom Speech** | Train a customized acoustic + language model on Azure-hosted text/audio corpora. | Largest customization surface, slowest setup. | Strongest "deep" customization but heavy operationally; probably not needed for SF streets alone. |

**Recommendation hierarchy:**
1. Start with AWS Transcribe + Custom Vocabulary (we're already on AWS) + n-best (if batch) + post-hoc fuzzy match.
2. If proper-noun street names remain a recurring failure (Junipero Serra, Geary, Bayshore), evaluate **Deepgram Nova-3 with Keyterm Prompting** — that one feature is significantly better-targeted at this exact problem than anything AWS offers in the non-medical Transcribe family. Streaming-friendly too.
3. Google STT's `$ADDRESSNUM` class is the best-fit primitive for the *address* path; less so for intersections.

### 4.4 On-device / Web Speech API

Web Speech API on mobile has confirmed, documented unreliability:

- Safari/iOS: interim results duplicate, `isFinal` never fires, recognition gets throttled and switches to cloud mid-stream. ([WebKit issue #120](https://github.com/WebKit/Documentation/issues/120); [Apple Developer Forums thread](https://developer.apple.com/forums/thread/694847))
- Requires online connectivity on Chrome/Safari — recognition runs on Google/Apple servers.
- General industry sentiment ([addpipe deep dive](https://blog.addpipe.com/a-deep-dive-into-the-web-speech-api/), [Medium "Taming the Web Speech API"](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1)): **don't ship it in production for anything user-critical on mobile.**

The user's memory note ("Web Speech API abandoned — unreliable on mobile") is squarely consistent with current industry sentiment in 2026.

**Apple Speech (`SFSpeechRecognizer`)** is much more reliable than Web Speech on iOS but requires a native iOS shell. Worth noting in case Care Connect ships a wrapper app — Apple Speech now supports on-device recognition for most languages without server round-trip.

### 4.5 Phonetic / fuzzy matching against a known vocabulary (post-hoc)

This is the **highest leverage technique** for the specific Junipero Serra → Junipero Sarah failure mode, because the transcription's phonetic content is right; the spelling is just wrong.

**Algorithms** ([Phonetic Matching Algorithms — Medium](https://medium.com/@ievgenii.shulitskyi/phonetic-matching-algorithms-50165e684526), [Babel Street — Fuzzy Name Matching Techniques](https://www.babelstreet.com/blog/fuzzy-name-matching-techniques)):

| Algorithm | Best for | Note |
| --- | --- | --- |
| **Soundex** | Surnames, simple cases | Fixed-length key (4 chars), English-centric, weak for modern names. |
| **NYSIIS** | Street names | Babel Street article explicitly recommends NYSIIS for street names. Worth trying. |
| **Metaphone** | English proper nouns | Better than Soundex; variable-length key. |
| **Double Metaphone** | General-purpose, recommended default | Returns *primary* + *secondary* code, handles non-English origins (Spanish, Italian, Slavic) — important for SF (Cesar Chavez, Junipero, Bernal). |
| **Levenshtein / edit distance** | Typos | Doesn't help when the mis-spelling is phonetically faithful ("Sarah" vs "Serra"). |

**Recommended approach for Care Connect:**
1. Pre-compute Double Metaphone (primary + secondary) for every SF street name from DataSF `3psu-pn9h`.
2. After transcription, compute Double Metaphone of each token in the transcript, find best matches.
3. Combine with Levenshtein/token-set ratio as tiebreak.

**JavaScript libraries** (server-side Node.js):
- [`fuzzball`](https://github.com/nol13/fuzzball.js) — port of Python's fuzzywuzzy; `extract` for top-N matches with cutoff. Mature and battle-tested.
- [`fuse.js`](https://www.fusejs.io/) — most popular browser-friendly fuzzy library; client-side viable for SF's ~2k street list.
- [`fuzzysort`](https://github.com/farzher/fuzzysort) — fastest for "match against list" use cases, handles diacritics.
- [`natural`](https://github.com/NaturalNode/natural) (npm) — provides `Metaphone`, `DoubleMetaphone`, `SoundEx`, `NYSIIS` out of the box. **Best fit for the phonetic step.**
- [`double-metaphone`](https://github.com/words/double-metaphone) — focused, well-maintained.

**Suggested pipeline** for Junipero-Sarah failure:
```
transcript = "Junipero Sarah and Monterey"
tokens     = split on connectors -> ["Junipero Sarah", "Monterey"]
for each token:
  candidates = sfStreets.byDoubleMetaphone(token)
              .sortBy(combined(DoubleMetaphoneMatch, Levenshtein, NYSIIS))
              .top(5)
present candidates as confirmation chips: [Junipero Serra] [June Pereira] ...
```

---

## 5. UX patterns for unified address/intersection input

### 5.1 Detecting intent from input

Trivially regexable on the client. The connectors AWS, Esri, Google, and Mapbox all recognize are: **`&`, `/`, `@`, `\`, `|`, the word `and`, and the word `at`** (US locale) ([Esri docs](https://doc.esri.com/en/arcgis-pro/latest/help/data/geocoding/fundamentals-of-intersection-geocoding.html)).

A pragmatic detection heuristic:

```
isIntersection(input):
  normalized = input.trim().toLowerCase()
  // 1. explicit connector symbols
  if /[&/@\\|]/.test(normalized): return true
  // 2. " and " or " at " between two non-numeric tokens
  if / (and|at) /.test(normalized) AND no leading street number: return true
  // 3. otherwise, address (if starts with digit) or POI/place name
  if /^\d/.test(normalized): return "address"
  return "ambiguous"  // route to general search
```

### 5.2 Suggest behavior

The dominant pattern (Google, Apple, Uber, Lyft, Mapbox): **single field, mode auto-detected from the connector token, suggestion list re-types itself when the connector is typed.** Concretely:

- User types `16th` → suggestions show "16th St", "16th Ave", "16th & Mission", "16th & Valencia", "16th BART"…
- User types `16th &` → suggestions collapse to intersection-only.
- User types `16th & V` → suggestions show "16th & Valencia", "16th & Vermont", "16th & Van Ness".

AWS Location `Autocomplete` supports this directly — you can `Filter.IncludePlaceTypes: ["Intersection"]` once we detect the connector token, and use `BiasPosition` to keep results inside SF.

### 5.3 Natural-language input ("near 16th & Valencia", "outside the 16th St BART")

This is largely **unsolved** in shipping geocoders:

- Google explicitly doesn't parse "End of Main St" or "SW Corner of Main & Elm" ([Nodal Bits article](https://www.nodalbits.com/bits/google-maps-intersections/)).
- There is academic and patent work on it ([USPTO 11,341,334 — "Method and apparatus for evaluating natural language input to identify actions and landmarks"](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11341334); [USPTO 7,983,913 — "Understanding spoken location information based on intersections"](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7983913)), but no off-the-shelf product reliably handles arbitrary natural-language location.
- **Modern workaround**: an LLM pass (Claude / Bedrock) over the raw transcript can extract a structured `{ street1, street2, modifier: "near"|"outside"|"end of" }` triple, then call AWS Location with the extracted streets. This is novel territory but plausible given Care Connect is already an AWS/Bedrock shop (per project memory on the ID Scanner feature).

### 5.4 "Cross street as context" pattern (worth stealing)

Several CAD systems show the *address* as primary and the *nearest cross street* as secondary context, even when the user entered just an address. For an officer reading back a location over radio, "425 16th St — between Valencia and Guerrero" is materially more useful than just "425 16th St." Achievable in Care Connect by:

1. After resolving an address, call `ReverseGeocode` on its coordinates with `AdditionalFeatures: ["Intersections"]` to get the nearest two intersections.
2. Surface them as read-only "between X and Y" metadata under the address.

This is a cheap, high-value UX improvement orthogonal to the main "let officers enter intersections" feature.

---

## 6. Standards, accessibility, and miscellaneous findings

### 6.1 NIEM / APCO / NENA standards

The applicable standard for location representation in incident records is **NENA-STA-004.2-2024** — the [NG9-1-1 US Civic Location Data Exchange Format (CLDXF-US)](https://www.nena.org/news/675079/NENA-NG9-1-1-United-States-Civic-Location-Data-Exchange-Format-CLDXF-US-Standard-Now-Available.htm). It defines a structured civic address schema (`HNO`, `HNS`, `RD`, `STS`, `POD`, `MP`, etc.).

For inter-system incident exchange, **NENA/APCO EIDD (NENA-STA-021.1a / APCO 2.105.1-2017)** — [Emergency Incident Data Document](https://www.nena.org/page/EIDD) — is the NIEM-conformant XML schema used between disparate CAD/RMS/PSAP systems. It carries location both as civic address and as geometric/lat-lng.

For Care Connect, **the practical implication is small but worth noting**: if the incident record ever needs to be exchanged with a PSAP/CAD via EIDD, store **both** the structured intersection (`{ street1, street2 }`) *and* a normalized lat/lng. EIDD doesn't have a clean "intersection-only" civic-address mode — intersection-resolved data is typically transmitted as `LocationByValue` with geodetic coordinates plus a `LocationDescription` text containing "between X & Y."

References:
- [NENA Standard for NG9-1-1 GIS Data Model (NENA-STA-006.2-2022)](https://cdn.ymaws.com/www.nena.org/resource/resmgr/standards/nena-sta-006.2-2022_ng9-1-1_.pdf) — defines Road Centerlines layer schema.
- [NENA GIS Data Transition Info Document](https://cdn.ymaws.com/www.nena.org/resource/resmgr/standards/NENA-INF-046.1-2024_GIS_Data.pdf).

### 6.2 what3words

Worth a one-paragraph mention because it's gained real PSAP traction:

- Pre-integrated with Mark43, Versaterm, Hexagon OnCall, Sun Ridge RIMS, RapidDeploy, RapidSOS, and built into 4,800+ ECCs ([what3words.com — emergency adoption](https://what3words.com/business/emergency)).
- LAFD officially integrated it into CAD in 2021; Hayward PD and FD also adopted.
- Strength: 3-word strings (`///filled.count.soap`) are easier to dictate over voice than coordinates, and resolve to a 3m square.
- **Relevance to Care Connect**: not a substitute for intersection entry (officers won't memorize w3w words for their beat), but a *third* input modality alongside address + intersection that costs ~0 to add via the free what3words API. Could be a "if you can read me a w3w from a caller's phone, paste it here" affordance.

Ref: [Police1 — How what3words is changing PSAPs](https://www.police1.com/police-products/police-technology/software/cad/articles/what-if-you-could-save-a-life-in-three-words-well-theres-an-app-for-that-dRWTFl21O4Hqg96a/).

### 6.3 Accessibility considerations for voice + text address input

- **WCAG 2.2**: voice input is itself an accommodation; we must also ensure typed entry is fully equivalent (no voice-only flows).
- **Screen-reader compatibility**: when toggling between address-mode and intersection-mode suggestions, announce the change via `aria-live="polite"` so VoiceOver/TalkBack users know the result set has switched semantics.
- **Voice control users (Apple Voice Control, Dragon)** rely on stable accessibility labels for fields; the intersection auto-detect must not change the field's accessible name mid-interaction.
- **Field conditions**: bright sun, dark patrol cars, gloved hands all interact with input ergonomics. Auto-detection of intent (no toggle) reduces taps and is broadly an accessibility win.
- **Cognitive load**: officers are dictating under stress. Showing a confirmation chip (`16th St & Valencia St — tap to confirm`) before geocoding is preferable to silently snapping to a coordinate. CAD systems do exactly this in the dispatcher view.

### 6.4 Surprising / counterintuitive findings

1. **AWS Location v2's intersection support is real but the forward path is documentation-light.** The reverse-geocode "nearest intersection" feature is well-documented because that's how emergency services use it; the forward case is implicit. **Don't trust the docs alone — bench-test SF intersections.**
2. **Custom Vocabulary pronunciation hints (IPA / SoundsLike) were silently deprecated for non-medical use.** This is the single biggest "thing you'd expect to work, but doesn't" landmine. If we need real phonetic control over `Junipero`, we'll get it only by switching STT vendor (Deepgram Nova-3 Keyterm Prompting) or by accepting a fuzzy-match post-processing step.
3. **NYSIIS is specifically recommended for street names** over Double Metaphone (Babel Street article). I'd still default to Double Metaphone for SF because so many SF street names are Spanish-origin, but NYSIIS in combination would be worth measuring.
4. **Uber's intersection support was added primarily for *driver privacy*, not navigation efficiency.** This is a useful counter-data-point for the design doc — even though our motivation is different (officer ergonomics), the UX we want to copy is well-validated in a totally different problem domain.
5. **The dispatcher convention is to *drop* street suffixes for intersections** (`BOSTON & COOK`, not `BOSTON ST & COOK ST`). If officers learn this convention from radio traffic, our autocomplete should accept the suffix-less form transparently.
6. **DataSF makes a "vendor a local intersection index" approach genuinely cheap.** SF is small (~2k streets, ~10–15k intersections). A static index gives sub-100ms typeahead, zero AWS cost per keystroke, and a permanent fallback when AWS Location coverage misses an alley intersection.
7. **The phonetic failure mode is mostly about transliterated proper nouns.** `Junipero Serra` (Spanish), `Cesar Chavez` (Spanish), `Geary` (Irish), `Masonic` (English), `Embarcadero` (Spanish) — these break STT. Pure-English street names (`Market`, `Mission`, `Valencia` (as English) `Castro`, `Folsom`) generally transcribe fine. Suggests an 80/20: a curated *correction dictionary* of the ~50 most-mistranscribed SF street names could outperform a generic custom vocabulary.

---

## Appendix: Source index

### AWS Location Service
- [Places APIs (choose-api)](https://docs.aws.amazon.com/location/latest/developerguide/places-choose-api.html)
- [Geocode API reference](https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_Geocode.html)
- [How to geocode an address](https://docs.aws.amazon.com/location/latest/developerguide/how-to-geocode-address.html)
- [How to get intersections (ReverseGeocode)](https://docs.aws.amazon.com/location/latest/developerguide/reverse-how-to-get-intersections.html)
- [Autocomplete API reference](https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_Autocomplete.html)
- [v1 data-provider features](https://docs.aws.amazon.com/location/previous/developerguide/data-provider-features.html)

### AWS Transcribe
- [Custom vocabularies](https://docs.aws.amazon.com/transcribe/latest/dg/custom-vocabulary.html)
- [Custom language models](https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html)
- [Alternative transcriptions](https://docs.aws.amazon.com/transcribe/latest/dg/alternatives.html)
- [Build a custom vocabulary blog post](https://aws.amazon.com/blogs/machine-learning/build-a-custom-vocabulary-to-enhance-speech-to-text-transcription-accuracy-with-amazon-transcribe/)

### Other STT vendors
- [Deepgram Keywords](https://developers.deepgram.com/docs/keywords)
- [Deepgram Keyterm Prompting](https://developers.deepgram.com/docs/keyterm)
- [Deepgram Nova-3 launch](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api)
- [Deepgram multilingual Keyterm Prompting](https://deepgram.com/learn/deepgram-expands-nova-3-with-10-new-languages-and-multilingual-keyterm-prompting)
- [Best STT APIs 2026 — Deepgram blog](https://deepgram.com/learn/best-speech-to-text-apis-2026)
- [WebKit Documentation issue #120 — Web Speech API on iOS](https://github.com/WebKit/Documentation/issues/120)
- [Apple Developer Forums — Web Speech bugs in iOS 15.1](https://developer.apple.com/forums/thread/694847)
- [addpipe — A Deep Dive into the Web Speech API](https://blog.addpipe.com/a-deep-dive-into-the-web-speech-api/)

### Geocoders (consumer / commercial)
- [Google Geocoding API requests](https://developers.google.com/maps/documentation/geocoding/requests-geocoding)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Google Groups — Geocoding street intersections](https://groups.google.com/g/google-maps-api-web-services/c/UhvCp2yyx-M)
- [Nodal Bits — Google Maps & Intersections](https://www.nodalbits.com/bits/google-maps-intersections/)
- [Mapbox Geocoding v5](https://docs.mapbox.com/api/search/geocoding-v5/)
- [Mapbox Help — Search products](https://docs.mapbox.com/help/getting-started/geocoding/)
- [Mapbox cross-street-indexer (deprecated)](https://github.com/mapbox/cross-street-indexer)
- [Esri / ArcGIS Pro — Fundamentals of intersection geocoding](https://doc.esri.com/en/arcgis-pro/latest/help/data/geocoding/fundamentals-of-intersection-geocoding.html)
- [Nominatim issue #123 — intersection search](https://github.com/osm-search/Nominatim/issues/123)
- [OSM Help — finding intersection](https://help.openstreetmap.org/questions/16381/find-road-intersectiton-using-nominatim)
- [R-bloggers — Geocoding intersections with OSM](https://www.r-bloggers.com/2020/08/geocoding-an-intersection-with-open-street-map-data/)

### DataSF
- [Understanding SF's street-level data](https://www.sf.gov/understanding-san-franciscos-street-level-data)
- [Street Intersections — `ctsg-7znq`](https://data.sfgov.org/Geographic-Locations-and-Boundaries/Street-Intersections/ctsg-7znq/data)
- [List of Streets and Intersections — `pu5n-qu5c`](https://data.sfgov.org/Geographic-Locations-and-Boundaries/List-of-Streets-and-Intersections/pu5n-qu5c/data)
- [List of Intersections only — `sw2d-qfup`](https://data.sfgov.org/Geographic-Locations-and-Boundaries/List-of-Intersections-only/sw2d-qfup/data)
- [Streets — Active and Retired — `3psu-pn9h`](https://data.sfgov.org/Geographic-Locations-and-Boundaries/Streets-Active-and-Retired/3psu-pn9h)
- [Street Centerlines and Nodes (handbook)](https://datasf.gitbook.io/draft-publishing-standards/standard-reference-data/basemap/street-centerlines-nodes)
- [Socrata SODA API docs](https://dev.socrata.com/)

### CAD / RMS vendors and standards
- [BJA / LEITSC — Law Enforcement CAD Systems](https://bja.ojp.gov/sites/g/files/xyckuh186/files/media/document/leitsc_law_enforcement_cad_systems.pdf)
- [Billerica PD — COM-05 CAD SOP](https://public.powerdms.com/BillericaPD/documents/1846604)
- [Mark43 CAD](https://mark43.com/platform/cad/)
- [Motorola PremierOne User Guide](https://www.motorolasolutions.com/content/dam/msi/docs/support/manuals/CAD6_7_8UserGuide.pdf)
- [Tyler New World CAD — FirstArriving article](https://support.firstarriving.com/support/solutions/articles/36000485333-tyler-technologies-new-world-cad)
- [RapidSOS GIS Mapping](https://rapidsos.com/public-safety/gis-mapping/)
- [Axon — Complete Guide to Police RMS](https://www.axon.com/resources/police-rms)
- [NENA NG9-1-1 CLDXF-US Standard announcement](https://www.nena.org/news/675079/NENA-NG9-1-1-United-States-Civic-Location-Data-Exchange-Format-CLDXF-US-Standard-Now-Available.htm)
- [NENA Standard for NG9-1-1 GIS Data Model](https://cdn.ymaws.com/www.nena.org/resource/resmgr/standards/nena-sta-006.2-2022_ng9-1-1_.pdf)
- [NENA/APCO EIDD](https://www.nena.org/page/EIDD)

### Phonetic / fuzzy matching
- [Babel Street — Fuzzy Name Matching Techniques](https://www.babelstreet.com/blog/fuzzy-name-matching-techniques)
- [Medium — Phonetic Matching Algorithms](https://medium.com/@ievgenii.shulitskyi/phonetic-matching-algorithms-50165e684526)
- [fuzzball.js](https://github.com/nol13/fuzzball.js)
- [Fuse.js](https://www.fusejs.io/)
- [fuzzysort](https://github.com/farzher/fuzzysort)
- [natural (Node.js NLP, includes Double Metaphone / NYSIIS)](https://github.com/NaturalNode/natural)

### Ride-share / consumer maps
- [Engadget — Shield your address from Uber by using cross streets](https://www.engadget.com/2017-04-13-uber-cross-streets-for-pickup-and-dropoff.html)
- [Uber — Pickup Spots](https://www.uber.com/us/en/ride/how-it-works/pickup-spots/)
- [Uber Newsroom — Smooth pickup experience](https://www.uber.com/newsroom/smooth-pickup-experience/)
- [Apple Community — Intersection search](https://discussions.apple.com/thread/7666887)
- [MapKit documentation](https://developer.apple.com/documentation/mapkit/)
- [Waze community — intersection input](https://support.google.com/waze/thread/126493485/is-there-a-way-to-key-in-an-intersection-of-two-roads?hl=en)

### what3words
- [what3words emergency adoption](https://what3words.com/business/emergency)
- [Police1 — How what3words is changing PSAPs](https://www.police1.com/police-products/police-technology/software/cad/articles/what-if-you-could-save-a-life-in-three-words-well-theres-an-app-for-that-dRWTFl21O4Hqg96a/)
