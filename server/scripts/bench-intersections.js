// Bench-test AWS Location v2 forward intersection geocoding on SF intersections.
//
// Run from the server workspace:
//   node scripts/bench-intersections.js
//
// Or with a single category:
//   node scripts/bench-intersections.js --category=spanish
//
// Or with a single input format:
//   node scripts/bench-intersections.js --format=ampersand
//
// Reports per-intersection success/fail for both AutocompleteCommand and
// GeocodeCommand, across a few input format variations.

import '../config.js';

import {
  GeoPlacesClient,
  GeocodeCommand,
  AutocompleteCommand,
} from '@aws-sdk/client-geo-places';

const SF_BBOX = [-122.5155, 37.7080, -122.3570, 37.8120];
const SF_BIAS = [-122.4194, 37.7749];

const client = new GeoPlacesClient({
  credentials: {
    accessKeyId: process.env.AWS_LOCATION_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_LOCATION_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_LOCATION_REGION ?? 'us-west-2',
});

// Curated test set: ~30 SF intersections across 6 categories.
// Each entry: { a, b, category, note? }. `a` and `b` are the bare street names
// without suffixes (the CAD convention) — the script generates suffix variants
// itself.
const INTERSECTIONS = [
  // Major arterials (English) — should be easy
  { a: 'Market', b: 'Castro', category: 'arterial' },
  { a: 'Mission', b: '24th', category: 'arterial' },
  { a: 'Market', b: 'Powell', category: 'arterial' },
  { a: 'Van Ness', b: 'California', category: 'arterial' },
  { a: 'Geary', b: 'Masonic', category: 'arterial' },

  // Numbered grid — Mission/SoMa
  { a: '16th', b: 'Valencia', category: 'mission-soma' },
  { a: '16th', b: 'Mission', category: 'mission-soma' },
  { a: '24th', b: 'Mission', category: 'mission-soma' },
  { a: '3rd', b: 'Townsend', category: 'mission-soma' },
  { a: '7th', b: 'Folsom', category: 'mission-soma' },

  // Numbered grid — Sunset/Richmond (avenues)
  { a: '19th Ave', b: 'Sloat', category: 'west-side' },
  { a: 'Geary', b: '20th Ave', category: 'west-side' },
  { a: 'Irving', b: '9th Ave', category: 'west-side' },
  { a: 'Taraval', b: '19th Ave', category: 'west-side' },
  { a: 'California', b: '25th Ave', category: 'west-side' },

  // Spanish-origin / phonetically tricky
  { a: 'Junipero Serra', b: 'Monterey', category: 'spanish', note: 'prompt example' },
  { a: 'Cesar Chavez', b: 'Mission', category: 'spanish' },
  { a: 'Embarcadero', b: 'Folsom', category: 'spanish' },
  { a: 'Bayshore', b: 'Cortland', category: 'spanish' },
  { a: 'Dolores', b: '17th', category: 'spanish' },

  // Alley / minor street intersections
  { a: 'Minna', b: '6th', category: 'alley' },
  { a: 'Natoma', b: '8th', category: 'alley' },
  { a: 'Stevenson', b: '7th', category: 'alley' },
  { a: 'Maiden Lane', b: 'Grant', category: 'alley' },
  { a: 'Hooper', b: '7th', category: 'alley' },

  // Weird / historic / edge cases
  { a: 'The Embarcadero', b: 'Bay', category: 'edge' },
  { a: 'Fell', b: 'Stanyan', category: 'edge', note: 'Panhandle corner' },
  { a: 'Crestline', b: 'Twin Peaks Blvd', category: 'edge' },
  { a: 'Lombard', b: 'Hyde', category: 'edge', note: 'curvy block' },
  { a: 'Kezar', b: 'Lincoln', category: 'edge' },
];

const FORMATS = {
  ampersand: ({ a, b }) => `${a} & ${b}, San Francisco, CA`,
  and: ({ a, b }) => `${a} and ${b}, San Francisco, CA`,
  withSuffix: ({ a, b }) => `${withSt(a)} & ${withSt(b)}, San Francisco, CA`,
  bare: ({ a, b }) => `${a} & ${b}`,
};

function withSt (s) {
  // Don't double-suffix already-suffixed names like "19th Ave" or "The Embarcadero".
  if (/\b(St|Ave|Blvd|Rd|Lane|Way)\b/i.test(s)) return s;
  if (/^the /i.test(s)) return s;
  return `${s} St`;
}

async function tryGeocode (text) {
  try {
    const response = await client.send(new GeocodeCommand({
      QueryText: text,
      MaxResults: 1,
      BiasPosition: SF_BIAS,
      Filter: { BoundingBox: SF_BBOX, IncludeCountries: ['USA'] },
      Language: 'en',
      IntendedUse: 'SingleUse',
    }));
    const item = response.ResultItems?.[0];
    if (!item) return { ok: false, reason: 'no-result' };
    return {
      ok: true,
      placeType: item.PlaceType,
      label: item.Address?.Label ?? item.Title ?? null,
      intersection: item.Address?.Intersection ?? null,
      position: item.Position ?? null,
    };
  } catch (err) {
    return { ok: false, reason: 'error', error: err.name + ': ' + err.message };
  }
}

async function tryAutocomplete (text) {
  try {
    const response = await client.send(new AutocompleteCommand({
      QueryText: text,
      MaxResults: 5,
      BiasPosition: SF_BIAS,
      Filter: { BoundingBox: SF_BBOX, IncludeCountries: ['USA'] },
      Language: 'en',
      IntendedUse: 'SingleUse',
    }));
    const items = response.ResultItems ?? [];
    if (items.length === 0) return { ok: false, reason: 'no-result' };
    return {
      ok: true,
      count: items.length,
      first: {
        placeType: items[0].PlaceType,
        title: items[0].Title,
        label: items[0].Address?.Label ?? null,
        intersection: items[0].Address?.Intersection ?? null,
      },
      anyIntersection: items.some(it => it.PlaceType === 'Intersection'),
    };
  } catch (err) {
    return { ok: false, reason: 'error', error: err.name + ': ' + err.message };
  }
}

function fmtResult (r) {
  if (!r.ok) return `❌ ${r.reason}${r.error ? ' (' + r.error + ')' : ''}`;
  if (r.placeType) {
    const tag = r.placeType === 'Intersection' ? '✅ INT' : '⚠️  ' + r.placeType;
    return `${tag} · ${r.label ?? '(no label)'}`;
  }
  const tag = r.anyIntersection ? '✅ INT' : '⚠️  ' + (r.first?.placeType ?? '?');
  return `${tag} · ${r.first?.label ?? r.first?.title ?? '(no label)'} (${r.count})`;
}

async function main () {
  const args = Object.fromEntries(
    process.argv.slice(2).map(a => a.replace(/^--/, '').split('='))
  );
  const onlyCategory = args.category;
  const onlyFormat = args.format;

  const rows = onlyCategory
    ? INTERSECTIONS.filter(x => x.category === onlyCategory)
    : INTERSECTIONS;
  const formats = onlyFormat ? [onlyFormat] : Object.keys(FORMATS);

  const results = [];
  for (const intersection of rows) {
    for (const formatName of formats) {
      const text = FORMATS[formatName](intersection);
      const [geocode, autocomplete] = await Promise.all([
        tryGeocode(text),
        tryAutocomplete(text),
      ]);
      results.push({ intersection, formatName, text, geocode, autocomplete });
    }
  }

  // Pretty-print grouped by intersection
  let lastKey = null;
  for (const r of results) {
    const key = `${r.intersection.a} & ${r.intersection.b} [${r.intersection.category}]`;
    if (key !== lastKey) {
      console.log('');
      console.log(`▶ ${key}${r.intersection.note ? ' — ' + r.intersection.note : ''}`);
      lastKey = key;
    }
    console.log(`  [${r.formatName.padEnd(10)}] "${r.text}"`);
    console.log(`    Geocode      : ${fmtResult(r.geocode)}`);
    console.log(`    Autocomplete : ${fmtResult(r.autocomplete)}`);
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  const byCategoryFormat = {};
  for (const r of results) {
    const cat = r.intersection.category;
    byCategoryFormat[cat] ??= {};
    byCategoryFormat[cat][r.formatName] ??= { geocodeInt: 0, geocodeAny: 0, autoInt: 0, autoAny: 0, total: 0 };
    const s = byCategoryFormat[cat][r.formatName];
    s.total++;
    if (r.geocode.ok) {
      s.geocodeAny++;
      if (r.geocode.placeType === 'Intersection') s.geocodeInt++;
    }
    if (r.autocomplete.ok) {
      s.autoAny++;
      if (r.autocomplete.anyIntersection) s.autoInt++;
    }
  }
  for (const [cat, byFmt] of Object.entries(byCategoryFormat)) {
    console.log(`\n${cat}:`);
    for (const [fmt, s] of Object.entries(byFmt)) {
      console.log(`  ${fmt.padEnd(11)}  Geocode: ${s.geocodeInt}/${s.total} intersection, ${s.geocodeAny}/${s.total} any   |   Autocomplete: ${s.autoInt}/${s.total} intersection, ${s.autoAny}/${s.total} any`);
    }
  }

  // Overall
  const overall = { geocodeInt: 0, geocodeAny: 0, autoInt: 0, autoAny: 0, total: 0 };
  for (const r of results) {
    overall.total++;
    if (r.geocode.ok) {
      overall.geocodeAny++;
      if (r.geocode.placeType === 'Intersection') overall.geocodeInt++;
    }
    if (r.autocomplete.ok) {
      overall.autoAny++;
      if (r.autocomplete.anyIntersection) overall.autoInt++;
    }
  }
  console.log(`\nOVERALL (${overall.total} queries across ${rows.length} intersections × ${formats.length} formats):`);
  console.log(`  Geocode      → Intersection: ${overall.geocodeInt}/${overall.total} (${pct(overall.geocodeInt, overall.total)})  · Any result: ${overall.geocodeAny}/${overall.total} (${pct(overall.geocodeAny, overall.total)})`);
  console.log(`  Autocomplete → Intersection: ${overall.autoInt}/${overall.total} (${pct(overall.autoInt, overall.total)})  · Any result: ${overall.autoAny}/${overall.total} (${pct(overall.autoAny, overall.total)})`);
}

function pct (n, d) {
  return d === 0 ? '–' : `${Math.round((n / d) * 100)}%`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
