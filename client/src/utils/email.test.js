import { describe, expect, it } from 'vitest';

import { isEmail } from './email.js';

const validate = isEmail('Please enter a valid email address.');

describe('isEmail', () => {
  describe('accepts', () => {
    it.each([
      ['user@example.com'],
      ['user@sub.example.com'],
      ['user.name@example.com'],
      ['first+last@example.com'],
      ['first-last@example.com'],
      ['first_last@example.com'],
      // Apostrophe in local part — the case from issue #754.
      ["po'rourke@example.gov"],
      ["o'connor@example.com"],
    ])('%s', (email) => {
      expect(validate(email)).toBeNull();
    });
  });

  describe('rejects', () => {
    it.each([
      [''],
      ['no-at-sign'],
      ['user@'],
      ['user@nodomain'],
      ['@example.com'],
      // Leading dot in local part.
      ['.user@example.com'],
      // Consecutive dots in local part.
      ['us..er@example.com'],
      // Apostrophe immediately before @ (zod regex's last-char class excludes it).
      ["bad'@example.com"],
      // TLD too short.
      ['user@example.c'],
    ])('%s', (email) => {
      expect(validate(email)).toBe('Please enter a valid email address.');
    });
  });
});
