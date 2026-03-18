import { DateTime } from 'luxon';

import { isValidDeflection, isValidIncident } from '../../utils/validators';

const CUSTODY_TRANSFERRED_SUBJECT_STATUSES = new Set([
  'AWAITING_INTAKE',
  'READY_FOR_INTAKE',
  'FAILED_INTAKE',
  'ADMITTED',
  'IN_CHAIR',
  'RELEASED',
  'EXITED',
  'DEATH_IN_FACILITY',
  'DEATH_IN_CUSTODY',
]);

function isExpiredBeforeTransfer (deflection, now) {
  if (!deflection || CUSTODY_TRANSFERRED_SUBJECT_STATUSES.has(deflection.subjectStatus)) return false;
  if (deflection.status === 'EXPIRED') return true;
  if (deflection.status !== 'ACTIVE' || !deflection.expiresAt) return false;

  const expiresAt = DateTime.fromISO(deflection.expiresAt);
  return expiresAt.isValid && expiresAt < now;
}

export function getSfpdDeflectionStatusChip ({ deflection, incident, now = DateTime.now() }) {
  if (!deflection) return null;

  if (deflection.status === 'CANCELLED') {
    return { label: 'Canceled', tone: 'danger' };
  }

  if (isExpiredBeforeTransfer(deflection, now)) {
    return { label: 'Cancelled after expiry', tone: 'danger' };
  }

  if (CUSTODY_TRANSFERRED_SUBJECT_STATUSES.has(deflection.subjectStatus)) {
    return { label: 'Custody transferred', tone: 'info' };
  }

  const detailsComplete = isValidDeflection(deflection) && isValidIncident(incident);
  if (!detailsComplete) {
    return { label: 'Details incomplete', tone: 'warning' };
  }

  if (deflection.subjectStatus === 'ONSITE_AWAITING_TRANSFER') {
    return { label: 'Ready for custody transfer', tone: 'info' };
  }

  return { label: 'Awaiting arrival', tone: 'info' };
}
