// Fetch SF intersection + street data from DataSF and write vendored JSON.
//
// Run from the server workspace:
//   node scripts/build-intersection-data.js
//
// Output:
//   server/data/sf-intersections.json — one row per intersection (deduped by CNN)
//   server/data/sf-streets.json       — one row per canonical street name
//
// Data source: DataSF dataset `jfxm-zeee` ("Intersections by Each Cross Street
// Permutation"). ~21k rows; we dedupe to ~10–11k unique intersections.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

const SOCRATA_RESOURCE = 'https://data.sfgov.org/resource/jfxm-zeee.json';
const PAGE_SIZE = 5000;

async function fetchAllRows () {
  const allRows = [];
  let offset = 0;
  while (true) {
    const url = `${SOCRATA_RESOURCE}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=cnn`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DataSF fetch failed: ${response.status} ${response.statusText}`);
    }
    const rows = await response.json();
    console.log(`  fetched ${rows.length} rows (offset ${offset})`);
    if (rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

function loadAliases () {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'streetAliases.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Strip a known DataSF suffix from the end of a street name.
function splitSuffix (name) {
  const m = name.match(/^(.+?)\s(ST|AVE|BLVD|RD|LN|WAY|DR|HWY|PL|TER|CT|FWY|ALY|CIR|LOOP|WALK|PATH|PLZ|STWY)$/);
  if (m) return { base: m[1], suffix: m[2] };
  return { base: name, suffix: null };
}

function buildStreets (intersectionRows, aliases) {
  // Collect unique full names from both columns.
  const namesSeen = new Set();
  for (const row of intersectionRows) {
    if (row.street_name_1) namesSeen.add(row.street_name_1);
    if (row.street_name_2) namesSeen.add(row.street_name_2);
  }
  // Build alias reverse-map: { "BAY SHORE BLVD": ["BAYSHORE"], ... } — when a
  // canonical street's BASE matches an alias value, list the alias key as an
  // alternate.
  const aliasReverse = {};
  for (const [aliasKey, aliasValue] of Object.entries(aliases)) {
    // The alias maps user-form → DataSF-form base. We attach the user-form to
    // every canonical name whose base matches.
    aliasReverse[aliasValue] = aliasReverse[aliasValue] ?? [];
    aliasReverse[aliasValue].push(aliasKey);
  }

  const streets = [];
  for (const name of Array.from(namesSeen).sort()) {
    const { base, suffix } = splitSuffix(name);
    const street = {
      name,
      base,
      suffix,
      display: toDisplay(name),
    };
    if (aliasReverse[base]) street.aliases = aliasReverse[base];
    streets.push(street);
  }
  return streets;
}

function toDisplay (rawName) {
  // Strip zero-pad on numbered streets ("03RD" → "3RD"); title-case the rest.
  const stripped = rawName.replace(/\b0(\d(ST|ND|RD|TH))\b/g, '$1');
  return stripped
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function buildIntersections (rows) {
  // Dedupe by CNN. Each CNN appears twice (A→B, B→A); we keep the alphabetically
  // earlier (street1, street2) ordering for determinism.
  const byCnn = new Map();
  for (const r of rows) {
    if (!r.cnn || !r.street_name_1 || !r.street_name_2 || !r.latitude || !r.longitude) continue;
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const [s1, s2] = [r.street_name_1, r.street_name_2].sort();
    const entry = {
      cnn: r.cnn,
      street1: s1,
      street2: s2,
      lat,
      lng,
      zip: r.zip_code || null,
    };
    const existing = byCnn.get(r.cnn);
    if (!existing) {
      byCnn.set(r.cnn, entry);
    }
  }
  // Sort by street1 then street2 for stable diffs.
  return Array.from(byCnn.values()).sort((a, b) => {
    if (a.street1 !== b.street1) return a.street1 < b.street1 ? -1 : 1;
    return a.street2 < b.street2 ? -1 : 1;
  });
}

async function main () {
  console.log('Fetching DataSF jfxm-zeee...');
  const rows = await fetchAllRows();
  console.log(`Total rows: ${rows.length}`);

  const aliases = loadAliases();
  console.log(`Aliases: ${Object.keys(aliases).length}`);

  const intersections = buildIntersections(rows);
  console.log(`Unique intersections: ${intersections.length}`);

  const streets = buildStreets(rows, aliases);
  console.log(`Unique street names: ${streets.length}`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, 'sf-intersections.json'),
    JSON.stringify(intersections, null, 2) + '\n'
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'sf-streets.json'),
    JSON.stringify(streets, null, 2) + '\n'
  );
  console.log('Wrote sf-intersections.json + sf-streets.json');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
