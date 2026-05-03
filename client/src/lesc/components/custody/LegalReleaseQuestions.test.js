import { describe, expect, it } from 'vitest';

import { getPrefilledLegalReleaseState } from './legalReleasePresets';

describe('getPrefilledLegalReleaseState', () => {
  it('prefills medical issue release to hospital from search params', () => {
    const params = new URLSearchParams({
      from: 'detail',
      releaseReason: 'medical_issue',
      exitDestination: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'medical_issue',
      exitDestination: 'hospital',
    });
  });

  it('ignores exit destination presets for non-medical releases', () => {
    const params = new URLSearchParams({
      releaseReason: 'sobered',
      exitDestination: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'sobered',
      exitDestination: null,
    });
  });

  it('accepts behavioral health evaluation as a valid preset with an exit destination', () => {
    const params = new URLSearchParams({
      releaseReason: 'behavioral_health_evaluation',
      exitDestination: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: 'behavioral_health_evaluation',
      exitDestination: 'hospital',
    });
  });

  it('drops invalid preset values', () => {
    const params = new URLSearchParams({
      releaseReason: 'not-real',
      exitDestination: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReason: null,
      exitDestination: null,
    });
  });
});
