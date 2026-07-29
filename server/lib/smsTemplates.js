// SMS message bodies (D8/D9), per the Content Matrix. Every message is prefixed
// "CareConnect:". Minimal, NO PII — no names, DOB, or identifiers — plus a deep
// link into the app for detail. Count-aware pluralization. (Link TARGETS are
// still the current routes; the matrix specifies different destinations —
// in-transit tab / scan-transfer camera / person details — pending routing work.)

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
// optional; when present it reads e.g. "10-15 minutes away", else it's omitted.
export function newHoldBody (facility, { deflectionId, eta } = {}) {
  const etaClause = eta ? `, ${eta}` : '';
  return `CareConnect: 1 person in transit${etaClause}. View hold: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// ARRIVAL — an officer marked arrival for a party of `count` people (one grouped
// message, not one per person).
export function arrivalBody (facility, { count } = {}) {
  const verb = count === 1 ? 'has' : 'have';
  const state = count === 1 ? 'is' : 'are';
  return `CareConnect: ${pluralPeople(count)} ${verb} arrived at ${facility.name} and ${state} awaiting transfer. Transfer person: ${linkTo(facility, '/holds')}`;
}

// EXIT — a person reached the EXITED state (via exit, release, or exit-to-jail).
export function exitBody (facility, { deflectionId } = {}) {
  return `CareConnect: 1 person exited ${facility.name}. View details: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}
