import { describe, expect, it } from 'vitest';

import { getPrefilledLegalReleaseState } from './legalReleasePresets';

describe('getPrefilledLegalReleaseState', () => {
  it('prefills medical issue release to hospital from search params', () => {
    const params = new URLSearchParams({
      from: 'detail',
      releaseReason: 'MEDICAL_ISSUE',
      exitDestination: 'HOSPITAL_EMS',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'MEDICAL_ISSUE',
      exitDestination: 'HOSPITAL_EMS',
    });
  });

  it('ignores exit destination presets for non-medical releases', () => {
    const params = new URLSearchParams({
      releaseReason: 'SOBERED',
      exitDestination: 'HOSPITAL_EMS',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'SOBERED',
      exitDestination: null,
    });
  });

  it('accepts BH Emergency/5150 as a valid preset with an exit destination', () => {
    const params = new URLSearchParams({
      releaseReason: 'BH_EMERGENCY_5150',
      exitDestination: 'HOSPITAL_EMS',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'BH_EMERGENCY_5150',
      exitDestination: 'HOSPITAL_EMS',
    });
  });

  it('drops invalid preset values', () => {
    const params = new URLSearchParams({
      releaseReason: 'NOT_REAL',
      exitDestination: 'HOSPITAL_EMS',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: null,
      exitDestination: null,
    });
  });

  it('prefills other release without an exit destination', () => {
    const params = new URLSearchParams({
      releaseReason: 'OTHER',
      exitDestination: 'HOSPITAL_EMS',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'OTHER',
      exitDestination: null,
    });
  });
});
