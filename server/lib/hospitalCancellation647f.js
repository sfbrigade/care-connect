import { DateTime } from 'luxon';

import { isIncidentLocationComplete } from './incidentPermissions.js';

export const HOSPITAL_CANCEL_REASON = 'HOSPITAL';
export const HOSPITAL_CANCELLATION_INCOMPLETE_DETAILS_ERROR = 'SFPD policy requires person details to be completed before a medical-related cancelation';
export const HOSPITAL_CANCELLATION_ELIGIBLE_SUBJECT_STATUSES = new Set([
  'DETAINED',
  'ONSITE_AWAITING_TRANSFER',
  'AWAITING_INTAKE',
  'FAILED_INTAKE',
  'READY_FOR_INTAKE',
  'IN_MEDICAL_INTAKE',
  'IN_CHAIR',
]);

function hasMinimumAlphanumericChars (value, minimum) {
  const alphanumericCount = String(value ?? '').match(/[0-9a-z]/gi)?.length ?? 0;
  return alphanumericCount >= minimum;
}

export function hasCompleteHospitalCancellationDetails (deflection) {
  const subject = deflection?.subject;
  const incident = deflection?.incident;

  const subjectComplete = Boolean(
    subject?.firstName &&
    subject?.lastName &&
    subject?.dateOfBirth &&
    subject?.sex &&
    subject?.race
  );

  const incidentComplete = Boolean(
    isIncidentLocationComplete(incident) &&
    incident?.arrestedAt &&
    incident?.encounteredVia &&
    hasMinimumAlphanumericChars(incident?.cadNumber, 2) &&
    hasMinimumAlphanumericChars(incident?.caseNumber, 2) &&
    String(incident?.supervisorBadgeNumber ?? '').length >= 1 &&
    String(incident?.supervisorBadgeNumber ?? '').length <= 4
  );

  const deflectionComplete = Boolean(
    typeof deflection?.narcoticsSubstance === 'boolean' &&
    typeof deflection?.narcoticsParaphernalia === 'boolean' &&
    typeof deflection?.drugUseEvidence === 'boolean' &&
    (
      deflection?.drugUseEvidence === false ||
      Boolean(deflection?.drugType)
    ) &&
    String(deflection?.behavior ?? '').trim().length >= 2 &&
    String(deflection?.behaviorNarrative ?? '').trim().length >= 2 &&
    Boolean(deflection?.chargeType) &&
    Boolean(deflection?.property)
  );

  return subjectComplete && incidentComplete && deflectionComplete;
}

export function isHospitalCancellation647fEligible (deflection) {
  return (
    deflection?.status === 'ACTIVE' &&
    HOSPITAL_CANCELLATION_ELIGIBLE_SUBJECT_STATUSES.has(deflection?.subjectStatus)
  );
}

export function getHospitalCancellationReleaseNarrative (cancelledAt) {
  if (!cancelledAt) return '';

  const releasedAt = DateTime.fromJSDate(cancelledAt instanceof Date ? cancelledAt : new Date(cancelledAt), { zone: 'America/Los_Angeles' });
  const releasedAtText = releasedAt.isValid
    ? releasedAt.toFormat("HH:mm 'on' MM/dd/yyyy")
    : String(cancelledAt);

  return `The person was released at ${releasedAtText} due to a medical need and was transported to hospital.`;
}
