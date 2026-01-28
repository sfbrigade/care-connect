import { describe, expect, it } from 'vitest';

import { getPasswordStrengthScore } from './passwordStrength';

describe('getPasswordStrengthScore', () => {
  it('returns 0 for empty / non-string values', () => {
    expect(getPasswordStrengthScore('')).toBe(0);
    expect(getPasswordStrengthScore('   ')).toBe(0);
    expect(getPasswordStrengthScore(null)).toBe(0);
    expect(getPasswordStrengthScore(undefined)).toBe(0);
  });

  it('returns Weak for short passwords', () => {
    // Any non-empty string under 12 chars is capped at score 1.
    expect(getPasswordStrengthScore('short')).toBe(1);
    expect(getPasswordStrengthScore('12345678901')).toBe(1);
  });

  it('reaches Medium at minimum length', () => {
    expect(getPasswordStrengthScore('abcdefghijkl')).toBe(2); // 12 chars, low variety
  });

  it('reaches Strong via complexity (mixed classes)', () => {
    expect(getPasswordStrengthScore('OrangeCandyChocolate123')).toBeGreaterThanOrEqual(3);
  });

  it('reaches Strong via passphrase (multiple words)', () => {
    expect(getPasswordStrengthScore('correct horse battery staple')).toBeGreaterThanOrEqual(3);
    expect(getPasswordStrengthScore('correct-horse-battery-staple')).toBeGreaterThanOrEqual(3);
  });

  it('can reach the maximum score of 4', () => {
    expect(getPasswordStrengthScore('correct-horse-battery-staple-1234567890!@#$')).toBe(4);
  });
});

