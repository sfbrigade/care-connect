import { DateTime } from 'luxon';

const RELEASE_DUE_SOON_HOURS = 20;
const RELEASE_OVERDUE_HOURS = 24;

/**
 * Determine release timing status for a deflection
 * @param {object} deflection - Deflection object with subjectStatus and beginMedicalIntakeAt
 * @param {DateTime} now - Current time (injectable for testing)
 * @returns {{ label: string, tone: string } | null} - Chip config or null
 */
export function releaseTiming (deflection, now = DateTime.now()) {
  if (deflection?.subjectStatus !== 'IN_CHAIR') return null;
  if (!deflection?.beginMedicalIntakeAt) return null;

  const intakeStartedAt = typeof deflection.beginMedicalIntakeAt === 'string'
    ? DateTime.fromISO(deflection.beginMedicalIntakeAt)
    : DateTime.fromJSDate(deflection.beginMedicalIntakeAt);
  if (!intakeStartedAt.isValid) return null;

  const hoursSinceAdmission = now.diff(intakeStartedAt, 'hours').hours;

  if (hoursSinceAdmission >= RELEASE_OVERDUE_HOURS) {
    return { label: 'Overdue for release', tone: 'danger' };
  }
  if (hoursSinceAdmission >= RELEASE_DUE_SOON_HOURS) {
    return { label: 'Release due soon', tone: 'warning' };
  }
  return null;
}
