// Spot-check the 30 SF intersections from bench-intersections.js against the
// authoritative DataSF dataset `jfxm-zeee` (Intersections by Each Cross Street
// Permutation). For each intersection, query both (a, b) and (b, a) orderings
// using prefix matching (suffix-agnostic), and report:
//   - found / not found
//   - candidate matches with lat/lng
//   - the canonical street_name_1 / street_name_2 (with suffix)
//
// Run: node scripts/bench-datasf-intersections.js

const INTERSECTIONS = [
  { a: 'Market', b: 'Castro', category: 'arterial' },
  { a: 'Mission', b: '24th', category: 'arterial' },
  { a: 'Market', b: 'Powell', category: 'arterial' },
  { a: 'Van Ness', b: 'California', category: 'arterial' },
  { a: 'Geary', b: 'Masonic', category: 'arterial' },

  { a: '16th', b: 'Valencia', category: 'mission-soma' },
  { a: '16th', b: 'Mission', category: 'mission-soma' },
  { a: '24th', b: 'Mission', category: 'mission-soma' },
  { a: '3rd', b: 'Townsend', category: 'mission-soma' },
  { a: '7th', b: 'Folsom', category: 'mission-soma' },

  { a: '19th Ave', b: 'Sloat', category: 'west-side' },
  { a: 'Geary', b: '20th Ave', category: 'west-side' },
  { a: 'Irving', b: '9th Ave', category: 'west-side' },
  { a: 'Taraval', b: '19th Ave', category: 'west-side' },
  { a: 'California', b: '25th Ave', category: 'west-side' },

  { a: 'Junipero Serra', b: 'Monterey', category: 'spanish' },
  { a: 'Cesar Chavez', b: 'Mission', category: 'spanish' },
  { a: 'Embarcadero', b: 'Folsom', category: 'spanish' },
  { a: 'Bayshore', b: 'Cortland', category: 'spanish' },
  { a: 'Dolores', b: '17th', category: 'spanish' },

  { a: 'Minna', b: '6th', category: 'alley' },
  { a: 'Natoma', b: '8th', category: 'alley' },
  { a: 'Stevenson', b: '7th', category: 'alley' },
  { a: 'Maiden Lane', b: 'Grant', category: 'alley' },
  { a: 'Hooper', b: '7th', category: 'alley' },

  { a: 'The Embarcadero', b: 'Bay', category: 'edge' },
  { a: 'Fell', b: 'Stanyan', category: 'edge' },
  { a: 'Crestline', b: 'Twin Peaks Blvd', category: 'edge' },
  { a: 'Lombard', b: 'Hyde', category: 'edge' },
  { a: 'Kezar', b: 'Lincoln', category: 'edge' },
];

// Map a user-style street name to a list of DataSF prefix candidates for query.
// DataSF uses zero-padded numbered streets ("01ST", "16TH"), uppercase, with
// suffix baked in and abbreviated (LANE → LN, STREET → ST, etc.). For some
// streets the leading "THE" is part of the canonical name ("THE EMBARCADERO").
// And a few are spelled split where you'd expect compound ("BAY SHORE" vs
// "BAYSHORE"). We return multiple prefix candidates and query all of them.
function toPrefixes (name) {
  let s = name.trim().toUpperCase();
  // Expand "LANE" → "LN", "STREET" → "ST" so abbreviated DataSF rows match.
  s = s.replace(/\s+STREET$/, ' ST');
  s = s.replace(/\s+AVENUE$/, ' AVE');
  s = s.replace(/\s+BOULEVARD$/, ' BLVD');
  s = s.replace(/\s+LANE$/, ' LN');
  s = s.replace(/\s+DRIVE$/, ' DR');
  s = s.replace(/\s+ROAD$/, ' RD');
  // Strip the trailing suffix word so we can prefix-match across ST/AVE/BLVD/...
  let base = s.replace(/\s+(ST|AVE|BLVD|RD|LN|WAY|DR|HWY|PL|TER|CT|FWY)$/, '');
  // Zero-pad single-digit numbered streets to match DataSF format ("3RD" → "03RD")
  base = base.replace(/^(\d)(ST|ND|RD|TH)\b/, '0$1$2');
  const candidates = [base];
  // "Embarcadero" might be stored as "THE EMBARCADERO".
  if (!base.startsWith('THE ')) candidates.push(`THE ${base}`);
  // Stripping "THE " also yields a candidate in case the user wrote "The Embarcadero".
  if (base.startsWith('THE ')) candidates.push(base.slice(4));
  // Compound→split: "BAYSHORE" might be stored as "BAY SHORE".
  if (base === 'BAYSHORE') candidates.push('BAY SHORE');
  return candidates;
}

async function findIntersection (a, b) {
  const aPrefixes = toPrefixes(a);
  const bPrefixes = toPrefixes(b);
  const url = (s1, s2) => {
    const where = `starts_with(upper(street_name_1), '${s1}') AND starts_with(upper(street_name_2), '${s2}')`;
    return `https://data.sfgov.org/resource/jfxm-zeee.json?$where=${encodeURIComponent(where)}&$limit=10`;
  };
  const queries = [];
  for (const ap of aPrefixes) {
    for (const bp of bPrefixes) {
      queries.push(fetch(url(ap, bp)).then(r => r.json()));
      queries.push(fetch(url(bp, ap)).then(r => r.json()));
    }
  }
  const results = await Promise.all(queries);
  // Dedupe by CNN
  const byCnn = new Map();
  for (const rows of results) {
    for (const row of rows) {
      if (!byCnn.has(row.cnn)) byCnn.set(row.cnn, row);
    }
  }
  return Array.from(byCnn.values());
}

function fmtCoord (row) {
  if (!row.latitude || !row.longitude) return '(no coord)';
  return `(${(+row.latitude).toFixed(5)}, ${(+row.longitude).toFixed(5)})`;
}

async function main () {
  const results = [];
  for (const x of INTERSECTIONS) {
    const matches = await findIntersection(x.a, x.b);
    results.push({ ...x, matches });
  }

  let lastCat = null;
  for (const r of results) {
    if (r.category !== lastCat) {
      console.log(`\n=== ${r.category} ===`);
      lastCat = r.category;
    }
    const label = `${r.a} & ${r.b}`.padEnd(38);
    if (r.matches.length === 0) {
      console.log(`❌ ${label}  no match in DataSF`);
    } else if (r.matches.length === 1) {
      const m = r.matches[0];
      console.log(`✅ ${label}  ${m.street_name_1} & ${m.street_name_2} ${fmtCoord(m)}`);
    } else {
      console.log(`⚠️  ${label}  ${r.matches.length} candidates:`);
      for (const m of r.matches) {
        console.log(`     · ${m.street_name_1} & ${m.street_name_2} ${fmtCoord(m)} [zip ${m.zip_code ?? '?'}]`);
      }
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  const byCat = {};
  for (const r of results) {
    byCat[r.category] ??= { found: 0, multi: 0, missing: 0, total: 0 };
    byCat[r.category].total++;
    if (r.matches.length === 0) byCat[r.category].missing++;
    else if (r.matches.length === 1) byCat[r.category].found++;
    else byCat[r.category].multi++;
  }
  const total = { found: 0, multi: 0, missing: 0, total: 0 };
  for (const [cat, s] of Object.entries(byCat)) {
    console.log(`  ${cat.padEnd(15)} found:${s.found}/${s.total}  multi:${s.multi}  missing:${s.missing}`);
    for (const k of ['found', 'multi', 'missing', 'total']) total[k] += s[k];
  }
  console.log(`  ${'OVERALL'.padEnd(15)} found:${total.found}/${total.total}  multi:${total.multi}  missing:${total.missing}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
