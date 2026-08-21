export const FORM_TIMEZONE = 'America/Los_Angeles';

export function formatDateTime24 (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleString('en-US', { timeZone: FORM_TIMEZONE, month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = d.toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).replace('24:', '00:');
  return `${date} ${time}`;
}

// formats a date-only value (no time component) as MM/DD/YYYY in Pacific time
export function formatDateOnly (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: FORM_TIMEZONE, month: '2-digit', day: '2-digit', year: 'numeric' });
}

// formats a datetime as separate month/date/year parts in Pacific time
export function formatDateParts (dateStr) {
  if (!dateStr) return { month: '', date: '', year: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '', date: '', year: '' };
  const opts = { timeZone: FORM_TIMEZONE };
  return {
    month: d.toLocaleString('en-US', { ...opts, month: '2-digit' }),
    date: d.toLocaleString('en-US', { ...opts, day: '2-digit' }),
    year: d.toLocaleString('en-US', { ...opts, year: 'numeric' }),
  };
}

export function formatTime (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function titleCase (str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function joinWords (...words) {
  return words.filter(Boolean).join(' ');
}

export function firstLastName (obj) {
  return [obj?.firstName?.trim(), obj?.lastName?.trim()].filter(Boolean).join(' ');
}

export function firstInitialLastName (obj, { period = true } = {}) {
  const firstInitial = obj?.firstName?.trim()?.charAt(0)?.toUpperCase();
  return [
    firstInitial && (period ? `${firstInitial}.` : firstInitial),
    obj?.lastName?.trim(),
  ].filter(Boolean).join(' ');
}

export function streetCityState (obj) {
  return [obj?.addressLine1, obj?.city, obj?.state].filter(Boolean).join(', ');
}

export function streetCityStateZip (obj) {
  return [streetCityState(obj), obj?.postalCode].filter(Boolean).join(' ');
}

/**
 * Human-readable rendering of an incident's location. Branches on
 * locationType to render "Street1 & Street2" for intersection mode while
 * falling back to the address shape (addressLine1, city, state) otherwise.
 *
 * Title-cases the DataSF-uppercase street names (e.g. "16TH ST" → "16th St"),
 * stripping the zero-pad on numbered streets.
 */
export function incidentLocationText (incident) {
  if (incident?.locationType === 'INTERSECTION') {
    const s1 = formatDataSfStreet(incident.street1);
    const s2 = formatDataSfStreet(incident.street2);
    const cross = [s1, s2].filter(Boolean).join(' & ');
    const cityState = [incident.city, incident.state].filter(Boolean).join(', ');
    return [cross, cityState].filter(Boolean).join(', ');
  }
  return streetCityState(incident);
}

function formatDataSfStreet (raw) {
  if (!raw) return '';
  // Already title-cased input (e.g. "16th St") — leave untouched.
  if (/[a-z]/.test(raw)) return raw;
  const stripped = String(raw).replace(/\b0(\d(ST|ND|RD|TH))\b/gi, '$1');
  return stripped
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}
