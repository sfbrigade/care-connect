// Phonetic matching of free-text street tokens against the SF street list.
//
// This is the fallback layer when direct prefix-match (intersections.search)
// fails — e.g., when voice transcription mishears "Junipero Serra" as
// "Junipero Sarah." Double Metaphone collapses both to the same phonetic key
// "JNPRSR" / "ANPRSR", so we can recover the intended street.
//
// Usage:
//   const matcher = buildMatcher(streets);
//   matcher.match("Junipero Sarah") // → [{ name: "JUNIPERO SERRA BLVD", score: 0.92 }, ...]

import natural from 'natural';

const { DoubleMetaphone, LevenshteinDistance } = natural;
const dm = new DoubleMetaphone();

/**
 * Build a matcher over a list of street records.
 * Each record must have `name` and `base` fields.
 *
 * Pre-computes the Double Metaphone codes once. The matcher returned exposes
 * `match(token, { limit })` which returns candidates ranked by a combined
 * phonetic + Levenshtein score.
 */
export function buildMatcher (streets) {
  // Pre-compute phonetic codes for each street's `base` (the part without suffix).
  // We index by primary code, with secondary code as fallback.
  const byPrimary = new Map();
  const bySecondary = new Map();
  const enriched = streets.map(street => {
    const [primary, secondary] = dm.process(street.base || street.name);
    const entry = { ...street, primary, secondary };
    if (!byPrimary.has(primary)) byPrimary.set(primary, []);
    byPrimary.get(primary).push(entry);
    if (secondary && secondary !== primary) {
      if (!bySecondary.has(secondary)) bySecondary.set(secondary, []);
      bySecondary.get(secondary).push(entry);
    }
    return entry;
  });

  function match (rawToken, { limit = 5 } = {}) {
    const token = String(rawToken).trim();
    if (!token) return [];
    const [tPrimary, tSecondary] = dm.process(token);

    // Collect candidates with exact phonetic match (primary↔primary,
    // primary↔secondary, etc.).
    const candidates = new Map();
    const collect = (entries, codeMatched) => {
      for (const entry of entries ?? []) {
        if (!candidates.has(entry.name)) {
          candidates.set(entry.name, { entry, codeMatched });
        }
      }
    };
    collect(byPrimary.get(tPrimary), 'primary');
    collect(byPrimary.get(tSecondary), 'secondary-input');
    collect(bySecondary.get(tPrimary), 'secondary-street');
    collect(bySecondary.get(tSecondary), 'secondary-both');

    // If no exact phonetic matches, fall back to a broader phonetic-prefix
    // sweep — streets whose code starts with the input's code, or vice versa.
    // Useful for partial inputs like "Junipero" against "JUNIPERO SERRA".
    if (candidates.size === 0 && tPrimary) {
      for (const entry of enriched) {
        if (
          entry.primary.startsWith(tPrimary) ||
          tPrimary.startsWith(entry.primary)
        ) {
          candidates.set(entry.name, { entry, codeMatched: 'prefix' });
        }
      }
    }

    // Score each candidate: phonetic-equality weight + Levenshtein-based bonus.
    const tokenUpper = token.toUpperCase();
    const scored = Array.from(candidates.values()).map(({ entry, codeMatched }) => {
      const lev = LevenshteinDistance(tokenUpper, entry.base, { insertion_cost: 1, deletion_cost: 1, substitution_cost: 1 });
      const denominator = Math.max(tokenUpper.length, entry.base.length, 1);
      const levSim = 1 - lev / denominator;
      const codeBonus = codeMatched === 'primary'
        ? 0.6
        : codeMatched === 'secondary-input' || codeMatched === 'secondary-street'
          ? 0.45
          : codeMatched === 'secondary-both'
            ? 0.4
            : 0.25;
      // Combined score in [0, 1].
      const score = Math.min(1, codeBonus + 0.4 * levSim);
      return { name: entry.name, base: entry.base, display: entry.display, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  return { match };
}
