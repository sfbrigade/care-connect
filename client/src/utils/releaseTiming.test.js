import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';

import { releaseTiming } from './releaseTiming';

const NOW = DateTime.fromISO('2026-03-22T12:00:00.000Z');

function hoursAgo (hours) {
  return NOW.minus({ hours }).toISO();
}

describe('releaseTiming', () => {
  it('returns null when subjectStatus is not IN_CHAIR', () => {
    expect(releaseTiming({ subjectStatus: 'IN_MEDICAL_INTAKE', medicalIntakeStartedAt: hoursAgo(25) }, NOW)).toBeNull();
    expect(releaseTiming({ subjectStatus: 'RELEASED', medicalIntakeStartedAt: hoursAgo(25) }, NOW)).toBeNull();
    expect(releaseTiming({ subjectStatus: 'EXITED', medicalIntakeStartedAt: hoursAgo(25) }, NOW)).toBeNull();
    expect(releaseTiming({ subjectStatus: 'AWAITING_INTAKE', medicalIntakeStartedAt: hoursAgo(25) }, NOW)).toBeNull();
  });

  it('returns null when medicalIntakeStartedAt is missing', () => {
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR' }, NOW)).toBeNull();
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: null }, NOW)).toBeNull();
  });

  it('returns null when under 20 hours', () => {
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(10) }, NOW)).toBeNull();
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(19.9) }, NOW)).toBeNull();
  });

  it('returns Release due soon between 20 and 24 hours', () => {
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(20) }, NOW)).toEqual({ label: 'Release due soon', tone: 'warning' });
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(22) }, NOW)).toEqual({ label: 'Release due soon', tone: 'warning' });
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(23.9) }, NOW)).toEqual({ label: 'Release due soon', tone: 'warning' });
  });

  it('returns Overdue for release at 24+ hours', () => {
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(24) }, NOW)).toEqual({ label: 'Overdue for release', tone: 'danger' });
    expect(releaseTiming({ subjectStatus: 'IN_CHAIR', medicalIntakeStartedAt: hoursAgo(48) }, NOW)).toEqual({ label: 'Overdue for release', tone: 'danger' });
  });

  it('returns null for null deflection', () => {
    expect(releaseTiming(null, NOW)).toBeNull();
    expect(releaseTiming(undefined, NOW)).toBeNull();
  });
});
