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
const NEIGHBORHOODS_GEOJSON = 'https://data.sfgov.org/resource/j2bu-swwd.geojson?$limit=200';
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

async function fetchNeighborhoodPolygons () {
  const response = await fetch(NEIGHBORHOODS_GEOJSON);
  if (!response.ok) {
    throw new Error(`Neighborhood fetch failed: ${response.status}`);
  }
  const geojson = await response.json();
  // Each feature has properties.nhood and a (Multi)Polygon geometry. Flatten
  // MultiPolygon into one polygon ring list per feature; we only need the
  // outer ring of each polygon for point-in-poly. SF neighborhoods have no
  // holes in practice.
  const polygons = [];
  for (const feature of geojson.features ?? []) {
    const name = feature?.properties?.nhood;
    const geom = feature?.geometry;
    if (!name || !geom) continue;
    if (geom.type === 'Polygon') {
      polygons.push({ name, rings: [geom.coordinates[0]] });
    } else if (geom.type === 'MultiPolygon') {
      const rings = geom.coordinates.map(poly => poly[0]);
      polygons.push({ name, rings });
    }
  }
  return polygons;
}

// Ray-casting point-in-polygon (lng, lat against ring of [lng, lat] points).
function pointInRing (lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function neighborhoodFor (lat, lng, polygons) {
  for (const poly of polygons) {
    for (const ring of poly.rings) {
      if (pointInRing(lng, lat, ring)) return poly.name;
    }
  }
  return null;
}

function annotateNeighborhoods (intersections, polygons) {
  let matched = 0;
  for (const row of intersections) {
    const hood = neighborhoodFor(row.lat, row.lng, polygons);
    if (hood) {
      row.neighborhood = hood;
      matched++;
    } else {
      row.neighborhood = null;
    }
  }
  return matched;
}

async function main () {
  console.log('Fetching DataSF jfxm-zeee...');
  const rows = await fetchAllRows();
  console.log(`Total rows: ${rows.length}`);

  const aliases = loadAliases();
  console.log(`Aliases: ${Object.keys(aliases).length}`);

  const intersections = buildIntersections(rows);
  console.log(`Unique intersections: ${intersections.length}`);

  console.log('Fetching SF Analysis Neighborhoods...');
  const polygons = await fetchNeighborhoodPolygons();
  console.log(`Neighborhood polygons: ${polygons.length}`);
  const matched = annotateNeighborhoods(intersections, polygons);
  console.log(`Intersections matched to a neighborhood: ${matched} / ${intersections.length}`);

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
