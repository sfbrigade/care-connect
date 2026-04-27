import { describe, expect, it } from 'vitest';

import { getPrefilledLegalReleaseState } from './legalReleasePresets';

describe('getPrefilledLegalReleaseState', () => {
  it('prefills medical issue release to hospital from search params', () => {
    const params = new URLSearchParams({
      from: 'detail',
      releaseReasonId: 'medical_issue',
      exitDestinationId: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReasonId: 'medical_issue',
      exitDestinationId: 'hospital',
    });
  });

  it('ignores exit destination presets for non-medical releases', () => {
    const params = new URLSearchParams({
      releaseReasonId: 'sobered',
      exitDestinationId: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReasonId: 'sobered',
      exitDestinationId: null,
    });
  });

  it('accepts behavioral health evaluation as a valid preset without an exit destination', () => {
    const params = new URLSearchParams({
      releaseReasonId: 'behavioral_health_evaluation',
      exitDestinationId: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReasonId: 'behavioral_health_evaluation',
      exitDestinationId: null,
    });
  });

  it('drops invalid preset values', () => {
    const params = new URLSearchParams({
      releaseReasonId: 'not-real',
      exitDestinationId: 'hospital',
    });

    expect(getPrefilledLegalReleaseState(params)).toEqual({
      releaseReasonId: null,
      exitDestinationId: null,
    });
  });
});
