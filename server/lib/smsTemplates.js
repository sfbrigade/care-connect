// Tools for building SMS message bodies

// Return an absolute deep link on the facility's own subdomain
function linkTo (facility, pathname, search) {
  const url = facility.baseURL;
  url.pathname = pathname;
  if (search) url.search = search;
  return url.toString();
}

// Format a drive-time (seconds) into "N-M minutes away"
export function formatEta (durationSeconds) {
  if (durationSeconds == null) return null;
  const minutes = Math.round(durationSeconds / 60);
  const lower = Math.floor(minutes / 5) * 5;
  if (lower === 0) return 'less than 5 minutes away';
  return `${lower}-${lower + 5} minutes away`;
}

// New Hold notification
export function newHoldBody (facility, { deflectionId, eta } = {}) {
  const etaClause = eta ? `, ${eta}` : '';
  return `CareConnect: Hold ${deflectionId} is in transit${etaClause}. View hold: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// One arrival notif can group several holds
export function arrivalBody (facility, { deflectionIds = [] } = {}) {
  const ids = [...deflectionIds].sort((a, b) => a - b);
  const many = ids.length !== 1;
  const label = many ? 'Holds' : 'Hold';
  const haveHas = many ? 'have' : 'has';
  const areIs = many ? 'are' : 'is';
  // Link opens the Take-custody QR scanner directly (Custody reads ?scan=1).
  return `CareConnect: ${label} ${ids.join(', ')} ${haveHas} arrived at ${facility.name} and ${areIs} awaiting transfer. Transfer custody: ${linkTo(facility, '/custody', 'scan=1')}`;
}

// Exit: a hold reached the EXITED state
export function exitBody (facility, { deflectionId } = {}) {
  return `CareConnect: Hold ${deflectionId} exited ${facility.name}. View details: ${linkTo(facility, `/custody/${deflectionId}`)}`;
}

// First-time enrollment welcome message
export function welcomeBody (facility) {
  return `CareConnect: You're now subscribed to SMS notifications. You can manage your preferences here: ${linkTo(facility, '/profile/notifications')}. Reply STOP to unsubscribe at any time.`;
}
