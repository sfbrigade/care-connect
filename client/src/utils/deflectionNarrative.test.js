import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Settings } from 'luxon';

import { buildDeflectionNarrative } from './deflectionNarrative';

describe('deflectionNarrative', () => {
  beforeEach(() => {
    Settings.defaultZone = 'UTC';
  });

  afterEach(() => {
    Settings.defaultZone = 'system';
  });

  it('builds narrative with incident details', () => {
    const narrative = buildDeflectionNarrative({
      incident: {
        addressLine1: '1455 Market St',
        arrestedAt: '2026-02-12T23:53:00Z',
      },
    });

    expect(narrative).toBe([
      'Officer encountered this individual at 1455 Market St on 2/12/2026 at 11:53 PM.',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
    ].join('\n'));
  });

  it('includes drug use line when provided', () => {
    const narrative = buildDeflectionNarrative({
      incident: {
        addressLine1: '1455 Market St',
        arrestedAt: '2026-02-12T23:53:00Z',
      },
      drugUseEvidence: true,
      drugType: 'ALCOHOL',
    });

    expect(narrative).toBe([
      'Officer encountered this individual at 1455 Market St on 2/12/2026 at 11:53 PM.',
      'Officer suspected person used intoxicants: Alcohol.',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
    ].join('\n'));
  });

  it('uses [DETAILS MISSING] placeholders for missing incident details', () => {
    const narrative = buildDeflectionNarrative({
      incident: {},
      drugUseEvidence: true,
    });

    expect(narrative).toBe([
      'Officer encountered this individual at [DETAILS MISSING] on [DETAILS MISSING] at [DETAILS MISSING].',
      '[DETAILS MISSING ON DRUG USE AND TYPE]',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
    ].join('\n'));
  });
});
