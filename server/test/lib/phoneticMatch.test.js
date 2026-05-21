import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildMatcher } from '../../lib/phoneticMatch.js';

const SF_STREETS_SUBSET = [
  { name: 'JUNIPERO SERRA BLVD', base: 'JUNIPERO SERRA', display: 'Junipero Serra Blvd', suffix: 'BLVD' },
  { name: 'CESAR CHAVEZ ST', base: 'CESAR CHAVEZ', display: 'Cesar Chavez St', suffix: 'ST' },
  { name: 'VALENCIA ST', base: 'VALENCIA', display: 'Valencia St', suffix: 'ST' },
  { name: 'MISSION ST', base: 'MISSION', display: 'Mission St', suffix: 'ST' },
  { name: 'MONTEREY BLVD', base: 'MONTEREY', display: 'Monterey Blvd', suffix: 'BLVD' },
  { name: 'EMBARCADERO', base: 'EMBARCADERO', display: 'The Embarcadero', suffix: null },
  { name: 'THE EMBARCADERO', base: 'THE EMBARCADERO', display: 'The Embarcadero', suffix: null },
  { name: 'GEARY BLVD', base: 'GEARY', display: 'Geary Blvd', suffix: 'BLVD' },
  { name: 'POLK ST', base: 'POLK', display: 'Polk St', suffix: 'ST' },
  { name: 'SARAH ST', base: 'SARAH', display: 'Sarah St', suffix: 'ST' },
];

test('match — Junipero Sarah → Junipero Serra (the headline case)', () => {
  const matcher = buildMatcher(SF_STREETS_SUBSET);
  const hits = matcher.match('Junipero Sarah');
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].name, 'JUNIPERO SERRA BLVD');
  assert.ok(hits[0].score > 0.7, `expected high score, got ${hits[0].score}`);
});

test('match — single-word phonetic equivalents', () => {
  const matcher = buildMatcher(SF_STREETS_SUBSET);
  // Both should phonetically equal Sarah's SR code → finds both Serra and Sarah
  const hits = matcher.match('Sarah');
  assert.ok(hits.length >= 1);
  // Top hit could be the literal SARAH ST or JUNIPERO SERRA depending on
  // Levenshtein; both should appear.
  const names = hits.map(h => h.name);
  assert.ok(names.includes('SARAH ST'));
});

test('match — partial multi-word input (Junipero alone matches JUNIPERO SERRA)', () => {
  const matcher = buildMatcher(SF_STREETS_SUBSET);
  const hits = matcher.match('Junipero');
  // "Junipero" alone shouldn't phonetically match "JUNIPERO SERRA" exactly,
  // but the prefix-fallback path should catch it.
  assert.ok(hits.some(h => h.name === 'JUNIPERO SERRA BLVD'));
});

test('match — empty input returns empty', () => {
  const matcher = buildMatcher(SF_STREETS_SUBSET);
  assert.deepEqual(matcher.match(''), []);
});

test('match — limit caps the result count', () => {
  const matcher = buildMatcher(SF_STREETS_SUBSET);
  const hits = matcher.match('Mission', { limit: 1 });
  assert.equal(hits.length, 1);
});
