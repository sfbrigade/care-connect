// SMS message bodies (D8/D9). Minimal, NO PII — no names, DOB, or identifiers —
// plus a deep link into the authenticated app for detail. Count-aware
// pluralization. Kept in one module (the SMS analog of server/emails/).

function pluralPeople (count) {
  return count === 1 ? '1 person' : `${count} people`;
}

// Build an absolute deep link on the facility's own subdomain.
function linkTo (facility, pathname) {
  const url = facility.baseURL;
  url.pathname = pathname;
  return url.toString();
}

// NEW_HOLD — a hold was created; a person is in transit. ETA (Phase 7) is
// optional; when null we omit it rather than block/send a broken message.
export function newHoldBody (facility, { deflectionId, eta } = {}) {
  const etaText = eta ? ` ETA: ${eta}.` : '';
  return `1 person in transit to ${facility.name}.${etaText} View: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// ARRIVAL — an officer marked arrival for a party of `count` people (one grouped
// message, not one per person). Links to the holds queue since it may span holds.
export function arrivalBody (facility, { count } = {}) {
  return `${pluralPeople(count)} arrived at ${facility.name}. View: ${linkTo(facility, '/holds')}`;
}

// EXIT — a person reached the EXITED state (via exit, release, or exit-to-jail).
export function exitBody (facility, { deflectionId } = {}) {
  return `1 person exited ${facility.name}. View: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}
