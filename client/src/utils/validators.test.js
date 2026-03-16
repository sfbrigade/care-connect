import { describe, expect, it } from 'vitest';

import { isValidIncident } from './validators';

describe('isValidIncident', () => {
  it('returns true for a complete incident', () => {
    expect(isValidIncident({
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      arrestedAt: new Date().toISOString(),
      encounteredVia: 'ON_VIEW',
      cadNumber: 'CAD123',
      supervisorBadgeNumber: '1234',
    })).toBe(true);
  });

  it('returns false when a required field is missing', () => {
    expect(isValidIncident({
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      arrestedAt: new Date().toISOString(),
      encounteredVia: 'ON_VIEW',
      cadNumber: '',
      supervisorBadgeNumber: '1234',
    })).toBe(false);
  });
});
