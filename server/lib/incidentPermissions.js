/**
 * Centralized helpers for incident and deflection permissions.
 *
 *   isIncidentDetailsComplete — are all required incident fields filled in?
 *   canModifyDeflection       — can this user modify a deflection?
 */

/**
 * Are all required incident fields filled in?
 */
export function isIncidentDetailsComplete (incident) {
  return !!(
    incident.addressLine1 &&
    incident.city &&
    incident.state &&
    incident.arrestedAt &&
    incident.encounteredVia &&
    incident.cadNumber &&
    incident.caseNumber &&
    incident.supervisorBadgeNumber
  );
}

/**
 * Can this user modify a deflection (edit fields, update subject, cancel, upload photos)?
 * Allowed for: the officer who currently controls the hold, custody users, or admins.
 */
export function canModifyDeflection (deflection, user) {
  if (user.isAdmin) return true;
  if (user.isCustody) return true;
  return deflection.currentOfficerId === user.id;
}
