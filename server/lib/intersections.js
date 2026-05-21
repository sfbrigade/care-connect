// SF intersection lookup, backed by a vendored DataSF index.
//
// Two flat JSON files are loaded at boot:
//   server/data/sf-intersections.json — one row per intersection (deduped by CNN)
//   server/data/sf-streets.json       — one row per canonical street name
//
// Build them with: node server/scripts/build-intersection-data.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  toPrefixes,
  parseCrossStreetInput,
  displayName,
} from './streetNormalization.js';
import { buildMatcher } from './phoneticMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

let cache = null;

function load () {
  if (cache) return cache;
  const intersections = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'sf-intersections.json'), 'utf8')
  );
  const streets = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'sf-streets.json'), 'utf8')
  );
  // Build a prefix index for streets: first letter → array of street records.
  // Small enough at ~2k entries that linear scan within a bucket is fine.
  const streetsByLetter = new Map();
  for (const street of streets) {
    const letter = street.name[0];
    if (!streetsByLetter.has(letter)) streetsByLetter.set(letter, []);
    streetsByLetter.get(letter).push(street);
  }
  const phoneticMatcher = buildMatcher(streets);
  cache = { intersections, streets, streetsByLetter, phoneticMatcher };
  return cache;
}

/** Test-only: clear the in-memory cache so a fresh load() re-reads the files. */
export function _resetCache () {
  cache = null;
}

/**
 * Return all street records whose `name` begins with any of the given prefixes.
 * Prefixes are uppercase. Returns at most `limit` matches.
 */
function matchStreets (prefixes, limit = 10) {
  const { streets, streetsByLetter } = load();
  const hits = [];
  const seen = new Set();
  for (const prefix of prefixes) {
    const bucket = streetsByLetter.get(prefix[0]) ?? streets;
    for (const street of bucket) {
      if (street.name.startsWith(prefix) && !seen.has(street.name)) {
        seen.add(street.name);
        hits.push(street);
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

/**
 * Find intersection rows matching street1 × street2 in either ordering.
 * Both side1 and side2 are arrays of candidate canonical names (full names
 * with suffix, uppercase).
 */
function lookupIntersections (side1Names, side2Names, limit = 10) {
  const { intersections } = load();
  const set1 = new Set(side1Names);
  const set2 = new Set(side2Names);
  const hits = [];
  for (const row of intersections) {
    const matches =
      (set1.has(row.street1) && set2.has(row.street2)) ||
      (set2.has(row.street1) && set1.has(row.street2));
    if (matches) {
      hits.push(row);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

/**
 * Search the intersection index for a free-text query like "16th & Valencia".
 * Returns up to `limit` candidate intersections.
 *
 * If the query doesn't parse as a cross-street, returns [].
 */
export function search (text, { limit = 10 } = {}) {
  const parsed = parseOrRecover(text);
  if (!parsed) return [];

  const side1Streets = rankedStreetCandidates(parsed.side1, 25);
  const side2Streets = rankedStreetCandidates(parsed.side2, 25);
  if (side1Streets.length === 0 || side2Streets.length === 0) return [];

  const side1Names = side1Streets.map(s => s.name);
  const side2Names = side2Streets.map(s => s.name);
  const rows = lookupIntersections(side1Names, side2Names, limit);
  return rows.map(toApiResult);
}

/**
 * Like `parseCrossStreetInput`, but if no connector is found, attempt a
 * "fused-connector" recovery: STT often collapses "and Mission" into
 * "admission" (a real English word). For each token whose direct parse
 * failed, try peeling a 1–3 char connector-like prefix off; if the remainder
 * is a known SF street base, split there. Returns null only if recovery also
 * fails.
 */
export function parseOrRecover (text) {
  const direct = parseCrossStreetInput(text);
  if (direct) return direct;
  return recoverFusedConnector(text);
}

const FUSED_CONNECTOR_PREFIXES = new Set(['AD', 'AND', 'AN', 'AT', 'N']);

function recoverFusedConnector (text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  // Strip a trailing city/state tail, same as parseCrossStreetInput.
  const cleaned = trimmed.replace(/,?\s*(san francisco|sf)\s*(,\s*ca\b.*)?$/i, '').trim();
  const tokens = cleaned.split(/\s+/);
  if (tokens.length < 2) return null;

  const { streets } = load();
  const knownBases = new Set(streets.map(s => s.base));

  for (let i = 0; i < tokens.length; i++) {
    const upper = tokens[i].toUpperCase();
    for (let cut = 1; cut <= 3 && cut < upper.length; cut++) {
      const prefix = upper.slice(0, cut);
      const suffix = upper.slice(cut);
      if (!FUSED_CONNECTOR_PREFIXES.has(prefix)) continue;
      if (!knownBases.has(suffix)) continue;
      const before = tokens.slice(0, i).join(' ').trim();
      const after = [suffix, ...tokens.slice(i + 1)].join(' ').trim();
      if (before && after) return { side1: before, side2: after };
    }
  }
  return null;
}

// Prefix-match a free-text token and rank so that streets whose `base`
// exactly equals one of the prefix candidates come first. This keeps the
// common "MISSION ST" from being crowded out by compound names like
// "MISSION BAY BLVD" within the result limit.
function rankedStreetCandidates (rawToken, limit) {
  const prefixes = toPrefixes(rawToken);
  const hits = matchStreets(prefixes, Math.max(limit * 4, 50));
  if (hits.length === 0) return [];
  const exactBases = new Set(prefixes);
  return [...hits].sort((a, b) => {
    const aExact = exactBases.has(a.base);
    const bExact = exactBases.has(b.base);
    if (aExact !== bExact) return aExact ? -1 : 1;
    if (a.base.length !== b.base.length) return a.base.length - b.base.length;
    return a.name < b.name ? -1 : 1;
  }).slice(0, limit);
}

/**
 * Find the `n` nearest intersections to a given lat/lng, sorted ascending by
 * straight-line distance. Used for "between X and Y" address context.
 */
export function findNearest (lat, lng, { n = 2 } = {}) {
  const { intersections } = load();
  // Compute squared planar distance — fine at the scale of SF (~12 km across).
  // 1 degree latitude ≈ 111 km; 1 degree longitude at SF ≈ 88 km. We scale
  // longitude to make the metric roughly isotropic so the ordering is correct.
  const lngScale = Math.cos((lat * Math.PI) / 180);
  const scored = intersections.map(row => {
    const dLat = row.lat - lat;
    const dLng = (row.lng - lng) * lngScale;
    return { row, d2: dLat * dLat + dLng * dLng };
  });
  scored.sort((a, b) => a.d2 - b.d2);
  return scored.slice(0, n).map(({ row, d2 }) => ({
    ...toApiResult(row),
    // Convert squared-degrees back to meters (rough): 1 deg lat ≈ 111000 m.
    distanceMeters: Math.round(Math.sqrt(d2) * 111000),
  }));
}

/**
 * Find candidate streets for a free-text token. Tries direct prefix match
 * first; if none, falls back to Double Metaphone phonetic matching. Returns
 * the matching street records (name + base + display) without intersection
 * lookup — call searchByStreets() to find intersections between two sides.
 */
export function findStreetCandidates (rawToken, { limit = 5 } = {}) {
  const { phoneticMatcher } = load();
  const ranked = rankedStreetCandidates(rawToken, limit);
  if (ranked.length > 0) {
    return ranked.map(s => ({
      name: s.name,
      base: s.base,
      display: s.display,
      score: 1,
      via: 'prefix',
    }));
  }
  // Fall back to phonetic.
  const phoneticHits = phoneticMatcher.match(rawToken, { limit });
  return phoneticHits.map(h => ({ ...h, via: 'phonetic' }));
}

/**
 * Search for intersections given two arrays of candidate street names
 * (full canonical names with suffix). Used by the voice path after phonetic
 * matching has produced candidates per side.
 */
export function searchByStreets (side1Names, side2Names, { limit = 10 } = {}) {
  const rows = lookupIntersections(side1Names, side2Names, limit);
  return rows.map(toApiResult);
}

/** Look up a single intersection by its DataSF CNN. */
export function findByCnn (cnn) {
  const { intersections } = load();
  const row = intersections.find(r => r.cnn === cnn);
  return row ? toApiResult(row) : null;
}

function toApiResult (row) {
  return {
    cnn: row.cnn,
    street1: row.street1,
    street2: row.street2,
    street1Display: displayName(row.street1),
    street2Display: displayName(row.street2),
    label: `${displayName(row.street1)} & ${displayName(row.street2)}`,
    latitude: row.lat,
    longitude: row.lng,
    zipCode: row.zip ?? null,
    neighborhood: row.neighborhood ?? null,
  };
}

export default {
  search,
  findNearest,
  findByCnn,
  findStreetCandidates,
  searchByStreets,
  parseOrRecover,
  _resetCache,
};
