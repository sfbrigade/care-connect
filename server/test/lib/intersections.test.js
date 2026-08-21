import { test } from 'node:test';
import assert from 'node:assert/strict';

import intersections from '../../lib/intersections.js';

// Integration tests against the vendored sf-intersections.json + sf-streets.json.
// These rely on the JSON being present (built via scripts/build-intersection-data.js).

test('search — exact known intersection', () => {
  const results = intersections.search('16th & Valencia');
  assert.ok(results.length >= 1);
  const hit = results.find(r => r.street1 === '16TH ST' && r.street2 === 'VALENCIA ST');
  assert.ok(hit, 'expected to find 16TH ST × VALENCIA ST');
  assert.equal(hit.label, '16th St & Valencia St');
  assert.ok(Math.abs(hit.latitude - 37.7649) < 0.001);
  assert.ok(Math.abs(hit.longitude - (-122.4219)) < 0.001);
});

test('search — handles "and" connector', () => {
  const results = intersections.search('16th and Mission');
  assert.ok(results.some(r => r.label.includes('16th St') && r.label.includes('Mission St')));
});

test('search — handles partial name (Junipero matches Junipero Serra)', () => {
  const results = intersections.search('Junipero & Monterey');
  const hit = results.find(r => r.label.includes('Junipero Serra'));
  assert.ok(hit, 'expected Junipero Serra Blvd & Monterey Blvd');
});

test('search — handles Bayshore alias (DataSF stores as "BAY SHORE")', () => {
  const results = intersections.search('Bayshore & Cortland');
  assert.ok(results.some(r => r.street1.includes('BAY SHORE') || r.street2.includes('BAY SHORE')));
});

test('search — handles "The Embarcadero" with and without "The"', () => {
  const withThe = intersections.search('The Embarcadero & Bay');
  const withoutThe = intersections.search('Embarcadero and Bay');
  assert.ok(withThe.length >= 1);
  assert.ok(withoutThe.length >= 1);
});

test('search — non-cross-street query returns empty', () => {
  assert.deepEqual(intersections.search('425 16th St'), []);
  assert.deepEqual(intersections.search('Valencia'), []);
  assert.deepEqual(intersections.search(''), []);
});

test('search — unknown street returns empty', () => {
  assert.deepEqual(intersections.search('Nonexistent & Mission'), []);
});

test('search — multi-candidate (Fell & Stanyan returns multiple nodes)', () => {
  const results = intersections.search('Fell & Stanyan');
  // Fell St & Stanyan St plus Fell Access Rd & Stanyan St — both real
  assert.ok(results.length >= 1);
  assert.ok(results.every(r => r.street1.startsWith('FELL') || r.street2.startsWith('FELL')));
});

test('search — west-side avenues (numbered Ave intersections)', () => {
  const results = intersections.search('Geary & 20th Ave');
  const hit = results.find(r =>
    (r.street1 === 'GEARY BLVD' && r.street2 === '20TH AVE') ||
    (r.street2 === 'GEARY BLVD' && r.street1 === '20TH AVE'));
  assert.ok(hit, 'expected GEARY BLVD × 20TH AVE');
});

test('search — single-digit numbered streets (3rd & Townsend)', () => {
  const results = intersections.search('3rd & Townsend');
  const hit = results.find(r =>
    (r.street1 === '03RD ST' && r.street2 === 'TOWNSEND ST') ||
    (r.street2 === '03RD ST' && r.street1 === 'TOWNSEND ST'));
  assert.ok(hit, 'expected 03RD ST × TOWNSEND ST');
  // Display should strip the zero-pad
  assert.ok(hit.label.startsWith('3rd St') || hit.label.endsWith('3rd St'));
});

test('findNearest — returns N nodes ordered by distance', () => {
  // 16th & Valencia coordinates
  const results = intersections.findNearest(37.76492, -122.42189, { n: 3 });
  assert.equal(results.length, 3);
  // First result should be 16TH ST × VALENCIA ST itself
  assert.equal(results[0].cnn, '24183000');
  // Distances should be monotonically increasing
  assert.ok(results[0].distanceMeters <= results[1].distanceMeters);
  assert.ok(results[1].distanceMeters <= results[2].distanceMeters);
});

test('findByCnn — known CNN returns row', () => {
  const result = intersections.findByCnn('24183000');
  assert.ok(result);
  assert.equal(result.street1, '16TH ST');
  assert.equal(result.street2, 'VALENCIA ST');
});

test('findByCnn — unknown CNN returns null', () => {
  assert.equal(intersections.findByCnn('99999999'), null);
});

test('parseOrRecover — recovers from "and Mission" → "admission" fusion', () => {
  // The STT collapse case from real-world voice transcription.
  const parsed = intersections.parseOrRecover('14th admission');
  assert.ok(parsed);
  assert.equal(parsed.side1, '14th');
  assert.equal(parsed.side2.toUpperCase(), 'MISSION');
});

test('parseOrRecover — direct parse still works when connector is present', () => {
  assert.deepEqual(
    intersections.parseOrRecover('16th & Valencia'),
    { side1: '16th', side2: 'Valencia' },
  );
});

test('parseOrRecover — rejects unrelated tokens (no fusion match)', () => {
  assert.equal(intersections.parseOrRecover('quickbrown fox jumped'), null);
});

test('search — recovers end-to-end from "X admission" voice fusion', () => {
  const results = intersections.search('14th admission');
  assert.ok(results.some(r => r.label === '14th St & Mission St'));
});
