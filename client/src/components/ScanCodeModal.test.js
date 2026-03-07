import { describe, expect, it } from 'vitest';

import { sanitizeManualCodeInput } from './scanCodeModalUtils';

describe('sanitizeManualCodeInput', () => {
  it('keeps only numeric characters', () => {
    expect(sanitizeManualCodeInput('12a-34b')).toBe('1234');
  });

  it('limits manual code input to 6 digits', () => {
    expect(sanitizeManualCodeInput('123456789')).toBe('123456');
  });

  it('returns an empty string when there are no digits', () => {
    expect(sanitizeManualCodeInput('abcdef')).toBe('');
  });
});
