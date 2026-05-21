// Normalize free-text SF street names to DataSF's canonical form.
//
// DataSF (`jfxm-zeee`) stores street names uppercase with abbreviated suffixes:
//   "16TH ST", "VALENCIA ST", "JUNIPERO SERRA BLVD", "THE EMBARCADERO",
//   "BAY SHORE BLVD" (split, not "BAYSHORE"), "01ST ST" (zero-padded).
//
// Officers will type informally ("16th and Valencia", "Junipero Serra", "Bayshore").
// `toPrefixes(name)` returns the set of DataSF prefix strings to try in a
// prefix-match query (covering suffix expansion, THE handling, compound→split,
// zero-pad).

const SUFFIX_EXPANSIONS = [
  [/\sSTREET$/, ' ST'],
  [/\sAVENUE$/, ' AVE'],
  [/\sBOULEVARD$/, ' BLVD'],
  [/\sLANE$/, ' LN'],
  [/\sDRIVE$/, ' DR'],
  [/\sROAD$/, ' RD'],
  [/\sHIGHWAY$/, ' HWY'],
  [/\sPLACE$/, ' PL'],
  [/\sTERRACE$/, ' TER'],
  [/\sCOURT$/, ' CT'],
  [/\sFREEWAY$/, ' FWY'],
  [/\sALLEY$/, ' ALY'],
  [/\sCIRCLE$/, ' CIR'],
  [/\sPLAZA$/, ' PLZ'],
  [/\sSTAIRWAY$/, ' STWY'],
];

const STRIP_TRAILING_SUFFIX = /\s(ST|AVE|BLVD|RD|LN|WAY|DR|HWY|PL|TER|CT|FWY|ALY|CIR|LOOP|WALK|PATH|PLZ|STWY)$/;

// Hand-curated SF-specific aliases that prefix-match can't catch.
// Loaded externally for testability; this is just the default.
const DEFAULT_ALIASES = {
  BAYSHORE: 'BAY SHORE',
};

// Ordinal-word → digit-form. SF numbered streets / avenues are stored as
// "03RD ST", "16TH AVE", etc. — but AWS Transcribe outputs the English word
// "Third", "Sixteenth", which the lookup can't bridge phonetically. We
// normalize these to the digit form before prefix-matching.
const ORDINAL_WORDS = {
  FIRST: '1ST', SECOND: '2ND', THIRD: '3RD', FOURTH: '4TH',
  FIFTH: '5TH', SIXTH: '6TH', SEVENTH: '7TH', EIGHTH: '8TH',
  NINTH: '9TH', TENTH: '10TH', ELEVENTH: '11TH', TWELFTH: '12TH',
  THIRTEENTH: '13TH', FOURTEENTH: '14TH', FIFTEENTH: '15TH',
  SIXTEENTH: '16TH', SEVENTEENTH: '17TH', EIGHTEENTH: '18TH',
  NINETEENTH: '19TH', TWENTIETH: '20TH',
  // Compound 21-30. Transcribe sometimes emits hyphenated, sometimes not.
  'TWENTY-FIRST': '21ST', 'TWENTY-SECOND': '22ND', 'TWENTY-THIRD': '23RD',
  'TWENTY-FOURTH': '24TH', 'TWENTY-FIFTH': '25TH', 'TWENTY-SIXTH': '26TH',
  'TWENTY-SEVENTH': '27TH', 'TWENTY-EIGHTH': '28TH', 'TWENTY-NINTH': '29TH',
  THIRTIETH: '30TH',
};

/** Title-case a single word, preserving common acronyms. */
function titleWord (w) {
  if (!w) return w;
  return w[0].toUpperCase() + w.slice(1).toLowerCase();
}

/** Title-case a phrase token-by-token. */
export function titleCase (s) {
  return String(s).split(/\s+/).map(titleWord).join(' ');
}

/** Expand a long-form trailing suffix word to DataSF's abbreviation. */
export function expandSuffix (raw) {
  let s = String(raw).trim().toUpperCase();
  for (const [pattern, replacement] of SUFFIX_EXPANSIONS) {
    if (pattern.test(s)) {
      s = s.replace(pattern, replacement);
      break;
    }
  }
  return s;
}

/**
 * Replace ordinal English words ("Third", "Sixteenth", "Twenty-First") with
 * their digit-suffix form ("3RD", "16TH", "21ST"). Handles both hyphenated
 * ("twenty-first") and space-separated ("twenty first") compound ordinals.
 */
export function expandOrdinalWords (raw) {
  let s = String(raw).toUpperCase();
  // Compound ordinals first (longest match), both hyphenated and spaced.
  for (const [word, digit] of Object.entries(ORDINAL_WORDS)) {
    if (word.includes('-')) {
      const spaced = word.replace('-', ' ');
      s = s.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
      s = s.replace(new RegExp(`\\b${spaced}\\b`, 'g'), digit);
    }
  }
  // Single-word ordinals.
  for (const [word, digit] of Object.entries(ORDINAL_WORDS)) {
    if (!word.includes('-')) {
      s = s.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }
  }
  return s;
}

/**
 * Produce candidate prefix strings for a DataSF prefix-match query.
 * Returns the union of plausible variants (suffix-stripped base, "THE"-prefixed,
 * alias-substituted, zero-padded numeric).
 *
 * @param {string} raw - user-typed street name (any case)
 * @param {Record<string,string>} [aliases] - alias map, e.g., { BAYSHORE: 'BAY SHORE' }
 * @returns {string[]} unique prefix candidates, uppercase
 */
export function toPrefixes (raw, aliases = DEFAULT_ALIASES) {
  const expanded = expandSuffix(expandOrdinalWords(raw));
  // Strip the trailing suffix word so the prefix matches any suffix variant.
  let base = expanded.replace(STRIP_TRAILING_SUFFIX, '');
  // Zero-pad single-digit numbered streets: 3RD → 03RD, 7TH → 07TH.
  base = base.replace(/^(\d)(ST|ND|RD|TH)\b/, '0$1$2');

  const candidates = new Set([base]);

  // Try with leading THE and without it.
  if (base.startsWith('THE ')) {
    candidates.add(base.slice(4));
  } else {
    candidates.add(`THE ${base}`);
  }

  // Substitute known compound→split aliases (and vice versa).
  for (const [from, to] of Object.entries(aliases)) {
    if (base === from) candidates.add(to);
    if (base === to) candidates.add(from);
  }

  return Array.from(candidates).filter(Boolean);
}

/**
 * Build a display-friendly name from a DataSF row name.
 *   "16TH ST"             → "16th St"
 *   "JUNIPERO SERRA BLVD" → "Junipero Serra Blvd"
 *   "THE EMBARCADERO"     → "The Embarcadero"
 *   "03RD ST"             → "3rd St"      (zero-pad stripped)
 */
export function displayName (rawDataSfName) {
  let s = String(rawDataSfName).trim();
  // Strip leading zero on numbered streets for display ("03RD" → "3RD").
  s = s.replace(/^0(\d(ST|ND|RD|TH))\b/i, '$1');
  return titleCase(s);
}

/**
 * Tokenize input on the canonical intersection connectors and return the two
 * sides if it looks like a cross-street query, or null otherwise.
 *
 *   "16th & Valencia"          → { side1: "16th", side2: "Valencia" }
 *   "Junipero Serra and Monterey" → { side1: "Junipero Serra", side2: "Monterey" }
 *   "425 16th St"              → null (looks like an address)
 *   "16th and Mission, SF, CA" → { side1: "16th", side2: "Mission" }   (trailing city stripped)
 */
export function parseCrossStreetInput (raw) {
  const input = String(raw).trim();
  if (!input) return null;
  // If it starts with a digit followed by a non-ordinal word, treat as an address.
  // Specifically: "425 Foo" is an address, but "16th & Mission" is an intersection.
  if (/^\d+\s+[A-Za-z]/.test(input) && !/^\d+(st|nd|rd|th)\b/i.test(input)) {
    return null;
  }
  // Strip trailing ", San Francisco, CA" or similar city/state tail.
  const trimmed = input.replace(/,?\s*(san francisco|sf)\s*(,\s*ca\b.*)?$/i, '').trim();
  // Split on the first connector found.
  const match = trimmed.match(/^\s*(.+?)\s*(?:&|\/|@|\band\b|\bat\b)\s*(.+?)\s*$/i);
  if (!match) return null;
  const [, side1, side2] = match;
  if (!side1 || !side2) return null;
  return { side1: side1.trim(), side2: side2.trim() };
}
