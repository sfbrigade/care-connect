/**
 * Centralized helpers for incident and deflection permissions.
 *
 *   isIncidentDetailsComplete — are all required incident fields filled in?
 *   isDeflectionDetailsComplete — are all required deflection fields filled in?
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
 * Are all required deflection fields filled in? Mirrors the client-side
 * DeflectionSchema in `client/src/utils/validators.js`. Expects the deflection
 * to be loaded with its `subject` relation included.
 */
export function isDeflectionDetailsComplete (deflection) {
  if (!deflection?.subject) return false;
  const { subject } = deflection;
  return !!(
    subject.firstName &&
    subject.lastName &&
    subject.dateOfBirth &&
    subject.sex &&
    subject.race &&
    typeof deflection.narcoticsSubstance === 'boolean' &&
    typeof deflection.narcoticsParaphernalia === 'boolean' &&
    typeof deflection.drugUseEvidence === 'boolean' &&
    (deflection.drugUseEvidence === false || deflection.drugType) &&
    deflection.behavior &&
    deflection.behaviorNarrative &&
    deflection.chargeType &&
    deflection.property &&
    deflection.certifiedAt
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
