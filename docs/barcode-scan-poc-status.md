# Barcode scan PoC — implementation notes
// Prepared by Claude, for @saadabdali

Working state, design rationale, and known issues for the PDF417 driver's-license barcode-scanning prototype. **This is throwaway PoC code**, not a feature. The goal is to demonstrate end-to-end feasibility on-device. Keep that scope in mind when reading; many things that would be required for a real shipped feature are deliberately omitted.

For the technical reference (PDF417 / AAMVA spec, library landscape, decoder UX best practices) see [`barcode-scanning-guide.md`](barcode-scanning-guide.md). This doc is the *implementation* counterpart.

## What it does

- Adds a "Scan ID barcode (PoC)" button at the top of `/holds` (LESC field-officer page).
- Opens a full-page route at `/scan-barcode-poc` rendering a live rear-camera view.
- Continuously decodes PDF417 from camera frames using `@zxing/browser`. On success, parses the AAMVA payload inline and shows the structured fields plus a collapsible "raw decoded data" disclosure.
- Renders an ID-card skeleton overlay (1.586:1 aspect, barcode area highlighted in the upper portion of the card) to coach the user on orientation.
- Runs a parallel pure-JS alignment heuristic on the barcode region of each frame and turns the overlay green when content "looks like" a fully-framed barcode.
- A debug HUD at the bottom shows the live alignment score so we can tune thresholds against real-world conditions.
- 100% on-device; no network calls.

## Files

- `client/src/lesc/components/BarcodeScanPoc.jsx` — the entire feature. Single component plus a tiny inline AAMVA parser. ~330 lines.
- `client/src/lesc/routes/LESCRoutes.jsx` — registers `/scan-barcode-poc` route.
- `client/src/lesc/components/Holds.jsx` — adds the launcher button (top of the page).
- `client/package.json` — adds `@zxing/browser` (~250 KB minified, includes the underlying `@zxing/library` decoder).

## Architecture

Three concurrent loops inside one component, sharing a `<video>` element:

1. **Camera + decoder** (`useEffect` keyed on `decoded`). Selects rear camera, requests 1920×1080, attaches stream to the video element, hands it to `BrowserPDF417Reader.decodeFromStream`. The decoder fires its callback on every frame; ignores "no barcode" errors, reacts to a real `Result` by stopping the controls, stopping MediaStream tracks, vibrating, and setting `decoded`.
2. **Alignment heuristic** (separate `useEffect`, also keyed on `decoded`). A 400ms `setInterval` that draws the *barcode region* of the current video frame into a 240px-wide offscreen canvas (reused via ref, not re-allocated), reads pixel data, computes the score (see "Alignment heuristic" below), and updates state with hysteresis.
3. **React render**. Pure functional output of the current state — video, overlay, debug HUD, decoded panel.

The two effects are independent; one stops when its work is done (decode succeeded), the other gets cleaned up the same way. Both clean up the camera on unmount or rescan.

## Key design decisions and why

### Library: `@zxing/browser` over jscanify/Scandit

ZXing is the open-source baseline; works fine for PDF417 in good conditions and has no per-scan cost. The technical guide identifies it as the right starting point. Commercial SDKs (Scandit, Dynamsoft, Scanbot) would be the upgrade path if real-world success rates are unacceptable; for the PoC we don't need them.

### Single component, no abstraction

Throwaway code. No subcomponents, no custom hooks, no separate parser module. Everything lives in one file, ~330 lines. If this graduates to a feature, the right factoring will become obvious through how it integrates — premature splitting now would just be wrong-flavored.

### Continuous live decode (not snap-and-decode)

Per the guide, glare disappears at slightly different angles, and natural human repositioning produces a successful frame within seconds. Snap-and-decode can fail repeatedly on a single static photo with persistent glare; live continuous scan converges within ~1–3s in good conditions.

### Pure-JS AAMVA parser, no `parse-usdl`

The format is trivially simple (3-letter codes, line-feed delimited). Adding a dep wasn't worth it. The inline `parseAamva` covers ~95% of real-world AAMVA cards. Edge cases not handled: AAMVA versions older than 2005 use slightly different codes, Canadian dates are `YYYYMMDD` instead of `MMDDYYYY`, some delimiters use `\r` instead of `\n` in older issuances. None of these matter for a PoC; all would matter for production.

### Pure-JS alignment heuristic, not OpenCV.js / jscanify

This was a deliberate decision after thinking through what we actually need. jscanify (which wraps OpenCV.js, ~10 MB WASM bundle) is built to find a document anywhere in a frame — Canny edge detection, `findContours`, `approxPolyDP`. We don't need any of that, because we have a viewfinder that already tells the user where to put the card. The question we actually need to answer isn't *"where is the document?"* but *"does our known viewfinder region look like a barcode is in it right now?"*

Region statistics over a known rectangle in pure JS solve that question at ~5% the code size and zero bundle hit. If/when this graduates to a feature where reliability across phones, lighting, and busy backgrounds matters, dropping in jscanify is a contained change.

### Alignment heuristic specifics

Three iterations got us to the current implementation. Recording all three so future-self knows what was tried:

1. **Edge density across the barcode region.** Count pixels with strong horizontal RGB gradient. Worked in principle, but too generous — any frame with high-frequency content (text, terminal windows, stripes) tripped the threshold.
2. **Per-row median crossings.** For each row, count how many times the brightness crosses the row mean (with a minimum amplitude). Take the median across rows, normalize by row width. Much more selective — PDF417's ~50–150 transitions per row are wildly distinctive. But still tripped on partially-framed barcodes, because the visible portion was dense enough to push the median above threshold.
3. **Per-row min-third density, aggregated by median across rows** (current). Each row's score is the *minimum* crossing density across its three column-thirds; the region's score is the median across rows. Now a partially-framed barcode scores near zero because at least one third is empty. Fully-framed barcode still scores 0.20–0.35.

Constants live at the top of the file as named module-scope constants so all three of (a) the JSX overlay, (b) the analysis math, and (c) the threshold tuning, operate on the same numbers and can't drift.

### Why the analysis runs at 400ms, not faster

`getImageData` forces a sync GPU readback that stalls the rendering pipeline. Initial implementation at 200ms made the decoder feel measurably slower (anecdotally; not measured rigorously). 400ms gives ZXing twice the unmolested frames. Phenomenologically the user can't tell the difference between 200ms and 400ms green-state latency, so this is essentially free.

### Why hysteresis (`ENTER` 0.20, `EXIT` 0.12)

Without it, the green/white state strobes whenever the user breathes near the threshold. Hysteresis is the standard fix and doesn't cost anything.

## Dead ends

### ZXing's `NEED_RESULT_POINT_CALLBACK` is not honored by PDF417

Hypothesized this would let us piggyback off ZXing's own start/stop pattern detection — if the decoder finds finder patterns, it almost-decoded a barcode, which is a free alignment signal. Wired it up; the callback never fired.

Verified by grep: in `node_modules/@zxing/library/esm/core/`, `NEED_RESULT_POINT_CALLBACK` is referenced in the Aztec, QR, MicroQR, UPC-EAN, OneD, and RSS14 decoders, but **not** in `pdf417/`. The PDF417 decoder in this library simply doesn't call back. Could be a JS-port omission, could also be true upstream in the Java original — didn't dig further. Either way, the signal isn't reachable through this library, and we should not waste time trying to plumb it through again.

If we ever switch to a commercial SDK (Scandit, Scanbot), they may expose richer scan-time signals — worth checking when the time comes.

## Tuning knobs

All in `BarcodeScanPoc.jsx` at the top of the file:

| Constant | Default | Effect of raising |
|---|---|---|
| `ALIGNMENT_ENTER_THRESHOLD` | 0.20 | Harder to trigger green. Raise if false-positive on clutter. |
| `ALIGNMENT_EXIT_THRESHOLD` | 0.12 | Wider hysteresis band. Raise if green flickers. |
| `ALIGNMENT_AMPLITUDE_MIN` | 60 | Higher = ignores subtler gradients. Raise if dim-room noise inflates score. |
| `ANALYSIS_INTERVAL_MS` | 400 | Less frequent updates, less ZXing competition, slower visual response. |
| `ANALYSIS_TARGET_WIDTH` | 240 | Higher = more detail but more CPU. Going wider didn't help in testing. |
| `BARCODE_INSET_X`, `BARCODE_INSET_TOP`, `BARCODE_HEIGHT_FRACTION` | 0.08 / 0.08 / 0.32 | Position of the barcode rectangle inside the card overlay. Tuned approximately for CA driver's licenses; varies by state but doesn't matter much because the heuristic doesn't require pixel-precise alignment. |

`ALIGNMENT_AMPLITUDE_MIN` is in "sum of RGB delta from row mean" units (i.e. 0–765 range), not 0–255. The 60 default is roughly equivalent to 20-per-channel; chosen to filter out compression noise and dim-room sensor noise.

## Known issues / things we deliberately didn't do

- **Heuristic is still slightly generous.** When we last tested, partial framing was much improved by the min-third change but might still occasionally trip green on very busy scenes. If this becomes a recurring complaint, raise `ALIGNMENT_ENTER_THRESHOLD` to 0.25. If genuinely-aligned scans stop turning green reliably, drop to 0.15.
- **No glare detection.** A barcode under heavy glare may show green (alignment OK) but never decode. The technical guide describes a histogram-based approach (look for saturated-pixel clusters in the detected region); ~20 lines on top of the current heuristic.
- **No coaching text over time.** The guide recommends fading in tips ("tilt slightly to reduce glare", etc.) at 3s and 7s. Not implemented.
- **No fallback for damaged or non-AAMVA cards.** Production would need either a manual-entry escape hatch or a "having trouble? upload a photo" route that calls Bedrock vision (which is what the existing `IdScanner.jsx` already does).
- **No tests.** PoC scope.
- **No accessibility consideration.** Camera-permission denial, blocked permissions, `prefers-reduced-motion`, screen-reader story for the camera view — none of this is addressed.
- **No integration with the existing `IdScanner` flow.** Currently a standalone button on `/holds`. The product question of how this relates to the existing snapshot-and-OCR ID scanner is explicitly out of scope. See "If this graduates to a feature" below.
- **No telemetry.** Production should log decode latency (P50 / P95) so we know whether real-world conditions justify staying on ZXing or upgrading to a commercial SDK.
- **No bundle size optimization.** `@zxing/browser` is loaded eagerly. For production it should be code-split / lazy-loaded only when entering the scanner, since most users on the LESC subdomain won't reach this path.
- **Analysis runs on the main thread.** Could move the canvas analysis to a Web Worker if it ever costs visibly. Not a problem at current scale.

## If this graduates to a feature

Big architectural question first: **does this replace the existing `IdScanner` flow, supplement it, or live in parallel?**

The existing `IdScanner.jsx` flow snaps a photo and sends it to Bedrock vision (`Api.ai.parseId`). That has costs the barcode flow doesn't:
- Per-scan API call billed to AWS.
- PII leaves the device.
- Slower (network round-trip + LLM latency).
- Robust to damaged barcodes, foreign IDs, and other PDF417-incompatible cases.

The barcode flow has costs the existing flow doesn't:
- Bigger bundle (`@zxing/browser` + the heuristic code).
- Limited to US/Canada AAMVA-compliant IDs.
- Fails on damaged or worn barcodes with no graceful fallback (yet).

A reasonable shipped version would be: **try the barcode first** (fast, free, on-device) and if the user can't get a decode in ~15–20s, surface the existing photo-based fallback. That gets the privacy and cost wins for the common case while keeping the existing flow as the safety net.

Other production work, in rough priority order:

1. Decide the integration question above. Most other decisions cascade from it.
2. Lazy-load the `@zxing/browser` bundle.
3. Coaching text over time + glare detection + a "Having trouble? Take a photo instead" escape hatch.
4. Tests — at minimum, `parseAamva` is unit-testable; the rest is hard to test without browser/device fixtures.
5. Telemetry on decode latency.
6. Accessibility: camera-permission denied state, error states, screen-reader copy.
7. Move heuristic to a Web Worker if profiling shows main-thread contention on older Androids.
8. Re-evaluate whether OpenCV.js (jscanify) is worth the bundle hit for more robust alignment feedback in adversarial conditions. Only justified if the homemade heuristic shows real-world false-positive/false-negative rates we can't tune away.
