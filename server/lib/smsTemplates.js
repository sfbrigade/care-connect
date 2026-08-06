// SMS message bodies (D8/D9), per the Content Matrix. Every message is prefixed
// "CareConnect:". Minimal, NO PII — no names, DOB, or identifiers — plus a deep
// link into the app for detail. Holds are identified by number (deflection id),
// with correct pluralization for grouped arrivals. (Link TARGETS are still the
// current routes; the matrix specifies different destinations — in-transit tab /
// scan-transfer camera / person details — pending routing work.)

// Build an absolute deep link on the facility's own subdomain (optional query).
function linkTo (facility, pathname, search) {
  const url = facility.baseURL;
  url.pathname = pathname;
  if (search) url.search = search;
  return url.toString();
}

// Format a drive-time (seconds) into the matrix's coarse "N-M minutes away"
// window. Returns null when there's no duration, so callers omit the ETA clause.
export function formatEta (durationSeconds) {
  if (durationSeconds == null) return null;
  const minutes = Math.round(durationSeconds / 60);
  const lower = Math.floor(minutes / 5) * 5;
  if (lower === 0) return 'less than 5 minutes away';
  return `${lower}-${lower + 5} minutes away`;
}

// NEW_HOLD — a hold became ready for transfer; the person is in transit. Always a
// single hold. ETA (Phase 7) is optional; when present it reads e.g. "10-15 minutes
// away", else it's omitted.
export function newHoldBody (facility, { deflectionId, eta } = {}) {
  const etaClause = eta ? `, ${eta}` : '';
  return `CareConnect: Hold ${deflectionId} is in transit${etaClause}. View hold: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// ARRIVAL — an officer marked arrival for one or more holds (one grouped message,
// not one per hold). Lists the hold numbers, pluralizing Hold/Holds + has/have +
// is/are for a single vs. multiple holds.
export function arrivalBody (facility, { deflectionIds = [] } = {}) {
  const ids = [...deflectionIds].sort((a, b) => a - b);
  const many = ids.length !== 1;
  const label = many ? 'Holds' : 'Hold';
  const haveHas = many ? 'have' : 'has';
  const areIs = many ? 'are' : 'is';
  // Link opens the Take-custody QR scanner directly (Custody reads ?scan=1).
  return `CareConnect: ${label} ${ids.join(', ')} ${haveHas} arrived at ${facility.name} and ${areIs} awaiting transfer. Transfer custody: ${linkTo(facility, '/custody', 'scan=1')}`;
}

// EXIT — a hold reached the EXITED state (via exit, release, or exit-to-jail).
export function exitBody (facility, { deflectionId } = {}) {
  return `CareConnect: Hold ${deflectionId} exited ${facility.name}. View details: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// WELCOME — sent once, the first time a user successfully subscribes. Links to
// their SMS preferences screen.
export function welcomeBody (facility) {
  return `CareConnect: You're now subscribed to SMS notifications. You can manage your preferences here: ${linkTo(facility, '/profile/notifications')}. Reply STOP to unsubscribe at any time.`;
}
