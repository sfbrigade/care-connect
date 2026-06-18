import { DateTime } from 'luxon';

import { isValidDeflection, isValidIncident } from '../../utils/validators';
import { isCustodyTransferredStatus } from './custodyTransferStatus';

export function isExpiredBeforeTransfer (deflection, now) {
  if (!deflection || deflection.subjectStatus !== 'DETAINED') return false;
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
    return { label: 'Canceled after expiry', tone: 'danger' };
  }

  if (isCustodyTransferredStatus(deflection.subjectStatus)) {
    return { label: 'Custody transferred', tone: 'success' };
  }

  const detailsComplete = isValidDeflection(deflection) && isValidIncident(incident);
  if (!detailsComplete) {
    return { label: 'Details incomplete', tone: 'danger' };
  }

  if (deflection.subjectStatus === 'ONSITE_AWAITING_TRANSFER') {
    return { label: 'Ready for custody transfer', tone: 'info' };
  }

  return { label: 'Awaiting arrival', tone: 'info' };
}
