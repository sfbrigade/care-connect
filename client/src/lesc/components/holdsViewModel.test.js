import { describe, expect, it } from 'vitest';

import { getTransferCodeStatus } from './holdsViewModel';

const completeIncident = {
  id: 55,
  addressLine1: '444 6th St',
  addressLine2: null,
  city: 'San Francisco',
  state: 'CA',
  arrestedAt: '2026-05-01T15:00:00.000Z',
  encounteredVia: 'ON_VIEW',
  cadNumber: 'AB12',
  caseNumber: 'CD34',
  supervisorBadgeNumber: '1234',
  deflections: [],
};

const completeDeflection = {
  id: 88,
  status: 'ACTIVE',
  subjectStatus: 'DETAINED',
  subject: {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01T00:00:00.000Z',
    sex: 'FEMALE',
    race: 'WHITE',
  },
  narcoticsSubstance: false,
  narcoticsParaphernalia: false,
  drugUseEvidence: false,
  drugType: null,
  behavior: 'Calm',
  behaviorNarrative: 'Cooperative during transfer.',
  chargeType: 'HS_11550',
  property: 'NONE',
  certifiedAt: '2026-05-01T15:05:00.000Z',
};

describe('getTransferCodeStatus', () => {
  it('returns a singular locked hint when one hold is ready to arrive', () => {
    expect(getTransferCodeStatus({
      incidents: [{ ...completeIncident, deflections: [completeDeflection] }],
      atFacility: false,
      canArrive: true,
    })).toEqual({
      icon: 'locked',
      label: 'Tap to unlock transfer code',
    });
  });

  it('returns a plural locked hint when multiple holds are ready to arrive', () => {
    expect(getTransferCodeStatus({
      incidents: [{ ...completeIncident, deflections: [completeDeflection, { ...completeDeflection, id: 89 }] }],
      atFacility: false,
      canArrive: true,
    })).toEqual({
      icon: 'locked',
      label: 'Tap to unlock transfer codes',
    });
  });

  it('returns the ready hint after arrival while active holds remain', () => {
    expect(getTransferCodeStatus({
      incidents: [{ ...completeIncident, deflections: [{ ...completeDeflection, subjectStatus: 'ONSITE_AWAITING_TRANSFER' }] }],
      atFacility: true,
      canArrive: false,
    })).toEqual({
      icon: 'ready',
      label: 'Transfer codes ready',
    });
  });

  it('returns null when no active holds remain', () => {
    expect(getTransferCodeStatus({
      incidents: [],
      atFacility: true,
      canArrive: false,
    })).toBeNull();
  });

  it('returns null when any active hold still has incomplete details', () => {
    expect(getTransferCodeStatus({
      incidents: [{ ...completeIncident, deflections: [{ ...completeDeflection, behaviorNarrative: null }] }],
      atFacility: false,
      canArrive: true,
    })).toBeNull();
  });
});
