import { describe, expect, it } from 'vitest';

import { hasMeaningfulHoldData } from './holdDataUtils';

describe('hasMeaningfulHoldData', () => {
  it('returns false for empty hold', () => {
    expect(hasMeaningfulHoldData({
      subjectId: null,
      narcoticsSubstance: null,
      narcoticsParaphernalia: null,
      behavior: null,
      property: null,
      propertyDetails: null,
      deflectionDetails: [],
      propertyPhotos: [],
    })).toBe(false);
  });

  it('returns true when subject exists', () => {
    expect(hasMeaningfulHoldData({ subjectId: 'abc' })).toBe(true);
  });

  it('returns true when partial non-subject details exist', () => {
    expect(hasMeaningfulHoldData({ behavior: 'partial details only' })).toBe(true);
    expect(hasMeaningfulHoldData({ narcoticsSubstance: false })).toBe(true);
    expect(hasMeaningfulHoldData({ deflectionDetails: [{ id: 'x' }] })).toBe(true);
  });
});
