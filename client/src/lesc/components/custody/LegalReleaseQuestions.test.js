import { describe, expect, it } from 'vitest';

import { getPrefilledLegalReleaseState } from './legalReleasePresets';

describe('getPrefilledLegalReleaseState', () => {
  it('prefills medical issue release to hospital from search params', () => {
    const params = new URLSearchParams({
      from: 'detail',
      releaseReason: 'MEDICAL_ISSUE',
      exitDestination: 'HOSPITAL',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'MEDICAL_ISSUE',
      exitDestination: 'HOSPITAL',
    });
  });

  it('ignores exit destination presets for non-medical releases', () => {
    const params = new URLSearchParams({
      releaseReason: 'SOBERED',
      exitDestination: 'HOSPITAL',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'SOBERED',
      exitDestination: null,
    });
  });

  it('accepts behavioral health evaluation as a valid preset with an exit destination', () => {
    const params = new URLSearchParams({
      releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
      exitDestination: 'HOSPITAL',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
      exitDestination: 'HOSPITAL',
    });
  });

  it('drops invalid preset values', () => {
    const params = new URLSearchParams({
      releaseReason: 'NOT_REAL',
      exitDestination: 'HOSPITAL',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: null,
      exitDestination: null,
    });
  });
});
