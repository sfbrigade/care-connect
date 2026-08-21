import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  expandSuffix,
  expandOrdinalWords,
  toPrefixes,
  displayName,
  titleCase,
  parseCrossStreetInput,
} from '../../lib/streetNormalization.js';

test('expandSuffix — long-form suffix → DataSF abbreviation', () => {
  assert.equal(expandSuffix('Valencia Street'), 'VALENCIA ST');
  assert.equal(expandSuffix('19th Avenue'), '19TH AVE');
  assert.equal(expandSuffix('Junipero Serra Boulevard'), 'JUNIPERO SERRA BLVD');
  assert.equal(expandSuffix('Maiden Lane'), 'MAIDEN LN');
  assert.equal(expandSuffix('Twin Peaks Drive'), 'TWIN PEAKS DR');
  assert.equal(expandSuffix('Sacramento Road'), 'SACRAMENTO RD');
  assert.equal(expandSuffix('Acme Alley'), 'ACME ALY');
});

test('expandSuffix — already-abbreviated suffix passes through', () => {
  assert.equal(expandSuffix('Valencia St'), 'VALENCIA ST');
  assert.equal(expandSuffix('19th Ave'), '19TH AVE');
  assert.equal(expandSuffix('BAY SHORE BLVD'), 'BAY SHORE BLVD');
});

test('expandSuffix — no suffix passes through uppercase', () => {
  assert.equal(expandSuffix('Embarcadero'), 'EMBARCADERO');
  assert.equal(expandSuffix('the embarcadero'), 'THE EMBARCADERO');
});

test('toPrefixes — strips trailing suffix for prefix-match', () => {
  assert.ok(toPrefixes('Valencia St').includes('VALENCIA'));
  assert.ok(toPrefixes('Junipero Serra Blvd').includes('JUNIPERO SERRA'));
});

test('toPrefixes — zero-pads single-digit numbered streets', () => {
  assert.ok(toPrefixes('3rd St').includes('03RD'));
  assert.ok(toPrefixes('7th').includes('07TH'));
  // 10th and above should not be padded
  assert.ok(toPrefixes('16th St').includes('16TH'));
  assert.ok(!toPrefixes('16th St').some(p => p.startsWith('0')));
});

test('toPrefixes — handles leading THE bidirectionally', () => {
  assert.ok(toPrefixes('Embarcadero').includes('THE EMBARCADERO'));
  assert.ok(toPrefixes('Embarcadero').includes('EMBARCADERO'));
  assert.ok(toPrefixes('The Embarcadero').includes('EMBARCADERO'));
  assert.ok(toPrefixes('The Embarcadero').includes('THE EMBARCADERO'));
});

test('toPrefixes — applies BAYSHORE → BAY SHORE alias', () => {
  const prefixes = toPrefixes('Bayshore');
  assert.ok(prefixes.includes('BAYSHORE'));
  assert.ok(prefixes.includes('BAY SHORE'));
});

test('toPrefixes — does not over-pad multi-digit ordinals', () => {
  assert.ok(!toPrefixes('25th Ave').some(p => p.startsWith('025')));
});

test('toPrefixes — long-form suffix expanded before stripping', () => {
  assert.ok(toPrefixes('Maiden Lane').includes('MAIDEN'));
});

test('toPrefixes — accepts uppercase input', () => {
  assert.ok(toPrefixes('VALENCIA ST').includes('VALENCIA'));
});

test('displayName — title-cases with zero-pad stripped', () => {
  assert.equal(displayName('16TH ST'), '16th St');
  assert.equal(displayName('03RD ST'), '3rd St');
  assert.equal(displayName('JUNIPERO SERRA BLVD'), 'Junipero Serra Blvd');
  assert.equal(displayName('THE EMBARCADERO'), 'The Embarcadero');
  assert.equal(displayName('BAY SHORE BLVD'), 'Bay Shore Blvd');
});

test('titleCase — basic', () => {
  assert.equal(titleCase('FOO BAR'), 'Foo Bar');
  assert.equal(titleCase('foo'), 'Foo');
  assert.equal(titleCase(''), '');
});

test('parseCrossStreetInput — recognizes &, /, @, and, at', () => {
  assert.deepEqual(parseCrossStreetInput('16th & Valencia'), { side1: '16th', side2: 'Valencia' });
  assert.deepEqual(parseCrossStreetInput('16th / Valencia'), { side1: '16th', side2: 'Valencia' });
  assert.deepEqual(parseCrossStreetInput('16th @ Valencia'), { side1: '16th', side2: 'Valencia' });
  assert.deepEqual(parseCrossStreetInput('16th and Valencia'), { side1: '16th', side2: 'Valencia' });
  assert.deepEqual(parseCrossStreetInput('16th at Valencia'), { side1: '16th', side2: 'Valencia' });
});

test('parseCrossStreetInput — strips trailing city/state tail', () => {
  assert.deepEqual(
    parseCrossStreetInput('16th & Valencia, San Francisco, CA'),
    { side1: '16th', side2: 'Valencia' }
  );
  assert.deepEqual(
    parseCrossStreetInput('Junipero Serra and Monterey, SF'),
    { side1: 'Junipero Serra', side2: 'Monterey' }
  );
});

test('parseCrossStreetInput — rejects addresses (digit + non-ordinal word)', () => {
  assert.equal(parseCrossStreetInput('425 16th St'), null);
  assert.equal(parseCrossStreetInput('100 Mission St'), null);
});

test('parseCrossStreetInput — accepts ordinal-starting intersections', () => {
  // "16th & Mission" starts with a digit but is an ordinal — still a cross-street
  assert.deepEqual(parseCrossStreetInput('16th & Mission'), { side1: '16th', side2: 'Mission' });
});

test('parseCrossStreetInput — rejects single-side input', () => {
  assert.equal(parseCrossStreetInput('Valencia St'), null);
  assert.equal(parseCrossStreetInput('16th'), null);
});

test('parseCrossStreetInput — handles multi-word street names', () => {
  assert.deepEqual(
    parseCrossStreetInput('Junipero Serra & Monterey'),
    { side1: 'Junipero Serra', side2: 'Monterey' }
  );
  assert.deepEqual(
    parseCrossStreetInput('Cesar Chavez and Mission'),
    { side1: 'Cesar Chavez', side2: 'Mission' }
  );
});

test('parseCrossStreetInput — empty/null returns null', () => {
  assert.equal(parseCrossStreetInput(''), null);
  assert.equal(parseCrossStreetInput('   '), null);
});

test('expandOrdinalWords — single-word ordinals', () => {
  assert.equal(expandOrdinalWords('Third'), '3RD');
  assert.equal(expandOrdinalWords('Sixteenth'), '16TH');
  assert.equal(expandOrdinalWords('Nineteenth Avenue'), '19TH AVENUE');
});

test('expandOrdinalWords — compound ordinals (hyphenated and spaced)', () => {
  assert.equal(expandOrdinalWords('Twenty-Fourth'), '24TH');
  assert.equal(expandOrdinalWords('twenty fourth'), '24TH');
  assert.equal(expandOrdinalWords('Twenty-First Avenue'), '21ST AVENUE');
});

test('expandOrdinalWords — leaves non-ordinal words alone', () => {
  assert.equal(expandOrdinalWords('Mission Street'), 'MISSION STREET');
  assert.equal(expandOrdinalWords('Junipero Serra'), 'JUNIPERO SERRA');
});

test('toPrefixes — handles ordinal-word input ("Third" → "03RD")', () => {
  assert.ok(toPrefixes('Third').includes('03RD'));
  assert.ok(toPrefixes('Sixteenth').includes('16TH'));
  assert.ok(toPrefixes('Twenty-First').includes('21ST'));
});
