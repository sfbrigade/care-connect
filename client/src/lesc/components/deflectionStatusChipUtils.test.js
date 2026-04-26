import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { getSfpdDeflectionStatusChip } from './deflectionStatusChipUtils';

function buildIncident (overrides = {}) {
  return {
    addressLine1: '100 Main St',
    city: 'San Francisco',
    state: 'CA',
    arrestedAt: '2026-03-04T10:00:00.000Z',
    encounteredVia: 'ON_VIEW',
    cadNumber: 'CAD-1234',
    caseNumber: 'CN-42',
    supervisorBadgeNumber: '1234',
    ...overrides,
  };
}

function buildDeflection (overrides = {}) {
  return {
    id: 1,
    status: 'ACTIVE',
    subjectStatus: 'DETAINED',
    expiresAt: '2099-03-04T12:00:00.000Z',
    subject: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01T00:00:00.000Z',
      sex: 'MALE',
      race: 'WHITE',
    },
    narcoticsSubstance: false,
    narcoticsParaphernalia: false,
    drugUseEvidence: false,
    drugType: null,
    chargeType: 'RWS_647F',
    behavior: 'Observed unsafe behavior',
    behaviorNarrative: 'Observed unsafe behavior',
    property: 'NONE',
    ...overrides,
  };
}

describe('getSfpdDeflectionStatusChip', () => {
  it('returns Details incomplete when incident or subject details are incomplete', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ subject: { firstName: 'Only' } }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Details incomplete', tone: 'danger' });
  });

  it('returns Details incomplete when case number lacks 2 alphanumeric characters', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection(),
      incident: buildIncident({ caseNumber: '-' }),
    });
    expect(chip).toEqual({ label: 'Details incomplete', tone: 'danger' });
  });

  it('returns Details incomplete when substance use evidence is unanswered', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ drugUseEvidence: null }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Details incomplete', tone: 'danger' });
  });

  it('returns Details incomplete when substance type is missing after yes', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ drugUseEvidence: true, drugType: null }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Details incomplete', tone: 'danger' });
  });

  it('returns Awaiting arrival when details complete and not arrived', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection(),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Awaiting arrival', tone: 'info' });
  });

  it('returns Details incomplete when charge type is missing', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ chargeType: null }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Details incomplete', tone: 'danger' });
  });

  it('returns Ready for custody transfer after arrived signal', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ subjectStatus: 'ONSITE_AWAITING_TRANSFER' }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Ready for custody transfer', tone: 'info' });
  });

  it('returns Custody transferred when in custody pipeline statuses', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ subjectStatus: 'AWAITING_INTAKE' }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Custody transferred', tone: 'success' });
  });

  it('returns Canceled when hold is cancelled', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ status: 'CANCELLED' }),
      incident: buildIncident(),
    });
    expect(chip).toEqual({ label: 'Canceled', tone: 'danger' });
  });

  it('returns Canceled after expiry when hold has expired before arrival', () => {
    const chip = getSfpdDeflectionStatusChip({
      deflection: buildDeflection({ expiresAt: '2026-03-04T10:00:00.000Z' }),
      incident: buildIncident(),
      now: DateTime.fromISO('2026-03-04T11:00:00.000Z'),
    });
    expect(chip).toEqual({ label: 'Canceled after expiry', tone: 'danger' });
  });
});
