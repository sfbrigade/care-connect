// SMS message bodies (D8/D9), per the Content Matrix. Every message is prefixed
// "CareConnect:". Minimal, NO PII — no names, DOB, or identifiers — plus a deep
// link into the app for detail. Count-aware pluralization. (Link TARGETS are
// still the current routes; the matrix specifies different destinations —
// in-transit tab / scan-transfer camera / person details — pending routing work.)

function pluralPeople (count) {
  return count === 1 ? '1 person' : `${count} people`;
}

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
  // Link opens the Take-custody QR scanner directly (Custody reads ?scan=1).
  return `CareConnect: ${pluralPeople(count)} ${verb} arrived at ${facility.name} and ${state} awaiting transfer. Transfer person: ${linkTo(facility, '/custody', 'scan=1')}`;
}

// EXIT — a person reached the EXITED state (via exit, release, or exit-to-jail).
export function exitBody (facility, { deflectionId } = {}) {
  return `CareConnect: 1 person exited ${facility.name}. View details: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// WELCOME — sent once, the first time a user successfully subscribes. Links to
// their SMS preferences screen.
export function welcomeBody (facility) {
  return `CareConnect: You're now subscribed to SMS notifications. You can manage your preferences here: ${linkTo(facility, '/profile/notifications')}. Reply STOP to unsubscribe at any time.`;
}
