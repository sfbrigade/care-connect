import { describe, expect, it } from 'vitest';

import { getDateOfBirthInputError, validateSubjectFormValues } from './validators';

describe('subject DOB validation', () => {
  it('requires a 4-digit year for partial DOB input', () => {
    expect(getDateOfBirthInputError('11/11/01')).toBe('Enter date of birth with a 4-digit year');
  });

  it('does not show an error for partial DOB input during typing', () => {
    expect(getDateOfBirthInputError('11/11/01', { allowPartial: true })).toBeNull();
  });

  it('rejects invalid calendar dates', () => {
    expect(getDateOfBirthInputError('13/40/2001')).toBe('Enter a valid date as MM/DD/YYYY');
  });

  it('accepts a complete DOB with a 4-digit year', () => {
    expect(getDateOfBirthInputError('11/11/2001')).toBeNull();
  });

  it('surfaces the DOB-specific error in subject form validation', () => {
    expect(validateSubjectFormValues({
      firstName: 'Alex',
      lastName: 'Taylor',
      dateOfBirth: '11/11/01',
      sex: 'MALE',
      race: 'WHITE',
    })).toEqual({
      dateOfBirth: 'Enter date of birth with a 4-digit year',
    });
  });
});
