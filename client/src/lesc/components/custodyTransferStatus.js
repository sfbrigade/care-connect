// Subject statuses that indicate custody has been transferred from SFPD to the
// Sheriff's Dept. Single source of truth for the "is custody transferred" check
// shared across the SFPD and custody views.
export const CUSTODY_TRANSFERRED_SUBJECT_STATUSES = new Set([
  'AWAITING_INTAKE',
  'READY_FOR_INTAKE',
  'FAILED_INTAKE',
  'IN_MEDICAL_INTAKE',
  'IN_CHAIR',
  'RELEASED',
  'EXITED',
  'DEATH_IN_FACILITY',
  'DEATH_IN_CUSTODY',
]);

export function isCustodyTransferredStatus (subjectStatus) {
  return CUSTODY_TRANSFERRED_SUBJECT_STATUSES.has(subjectStatus);
}
