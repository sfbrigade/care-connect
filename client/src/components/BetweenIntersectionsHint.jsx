import { useEffect, useState } from 'react';
import { Text } from '@mantine/core';

import Api from '@/Api';

/**
 * Renders "between {Street1} and {Street2}" below an address, sourced from the
 * two nearest SF intersection nodes per /api/geocode/intersections/nearest.
 *
 * Renders nothing when:
 *   - locationType is INTERSECTION (the intersection itself is the context)
 *   - lat/lng is missing (older records, manual entries)
 *   - the lookup fails or returns no useful pair
 */
function BetweenIntersectionsHint ({ record }) {
  const [pair, setPair] = useState(null);

  useEffect(() => {
    setPair(null);
    if (!record) return;
    if (record.locationType === 'INTERSECTION') return;
    const lat = Number(record.latitude);
    const lng = Number(record.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let cancelled = false;
    Api.geocode.intersectionsNearest(lat, lng, { n: 3 })
      .then((response) => {
        if (cancelled) return;
        const rows = response?.data ?? [];
        // Pick the first two intersections that share at least one street with each
        // other — that's the "X between Y and Z" pattern. Fall back to first two if
        // none share.
        const matched = pickPair(rows);
        if (matched) setPair(matched);
      })
      .catch(() => { /* silent — between context is best-effort */ });
    return () => { cancelled = true; };
  }, [record?.latitude, record?.longitude, record?.locationType]);

  if (!pair) return null;
  return (
    <Text c='dimmed' size='sm'>
      between {pair.cross1} and {pair.cross2}
    </Text>
  );
}

function pickPair (rows) {
  if (!rows || rows.length < 2) return null;
  // The interesting case: two adjacent nodes that share one street (we want
  // the cross-street name from each, NOT the shared street). Find a pair
  // sharing a street.
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const aStreets = [a.street1, a.street2];
      const bStreets = [b.street1, b.street2];
      const shared = aStreets.find(s => bStreets.includes(s));
      if (shared) {
        const cross1 = aStreets.find(s => s !== shared);
        const cross2 = bStreets.find(s => s !== shared);
        if (cross1 && cross2 && cross1 !== cross2) {
          return {
            cross1: titleCase(cross1),
            cross2: titleCase(cross2),
          };
        }
      }
    }
  }
  return null;
}

function titleCase (raw) {
  const stripped = String(raw).replace(/\b0(\d(ST|ND|RD|TH))\b/gi, '$1');
  return stripped
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export default BetweenIntersectionsHint;
