import { describe, expect, it } from 'vitest';

import { normalizeDobInput, validateSubject } from './validators';

const baseSubject = {
  firstName: 'Alex',
  lastName: 'Taylor',
  sex: 'MALE',
  race: 'WHITE',
};

describe('normalizeDobInput', () => {
  it('expands 2-digit years below 30 to the 2000s', () => {
    expect(normalizeDobInput('11/11/01')).toBe('11/11/2001');
    expect(normalizeDobInput('11/11/29')).toBe('11/11/2029');
  });

  it('expands 2-digit years at or above 30 to the 1900s', () => {
    expect(normalizeDobInput('11/11/30')).toBe('11/11/1930');
    expect(normalizeDobInput('11/11/99')).toBe('11/11/1999');
  });

  it('leaves 4-digit years alone', () => {
    expect(normalizeDobInput('11/11/2001')).toBe('11/11/2001');
  });

  it('leaves non-matching strings alone', () => {
    expect(normalizeDobInput('')).toBe('');
    expect(normalizeDobInput('11/11')).toBe('11/11');
  });
});

describe('SubjectSchema dateOfBirth validation', () => {
  it('accepts a 2-digit year by expanding with the pivot rule', () => {
    expect(validateSubject({ ...baseSubject, dateOfBirth: '11/11/01' })).toEqual({});
    expect(validateSubject({ ...baseSubject, dateOfBirth: '11/11/85' })).toEqual({});
  });

  it('accepts a 4-digit year', () => {
    expect(validateSubject({ ...baseSubject, dateOfBirth: '11/11/2001' })).toEqual({});
  });

  it('rejects calendar-invalid dates', () => {
    expect(validateSubject({ ...baseSubject, dateOfBirth: '13/45/2020' })).toEqual({
      dateOfBirth: 'Enter a valid date as MM/DD/YYYY',
    });
  });

  it('accepts empty input (DOB is optional so partial saves work)', () => {
    expect(validateSubject({ ...baseSubject, dateOfBirth: '' })).toEqual({});
  });

  it('accepts a fully empty subject (all SubjectSchema fields are optional for partial saves)', () => {
    expect(validateSubject({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      sex: '',
      race: '',
    })).toEqual({});
  });

  it('rejects incomplete input', () => {
    expect(validateSubject({ ...baseSubject, dateOfBirth: '11/11/2' })).toEqual({
      dateOfBirth: 'Enter a valid date as MM/DD/YYYY',
    });
  });
});
