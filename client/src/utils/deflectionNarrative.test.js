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

  it('builds narrative using incident details and selected behaviors', () => {
    const narrative = buildDeflectionNarrative({
      incident: {
        addressLine1: '1455 Market St',
        arrestedAt: '2026-02-12T23:53:00Z',
      },
      observedBehaviorNames: [
        'fumbling for ID or belongings',
        'poor hand-eye coordination',
      ],
    });

    expect(narrative).toBe([
      'Officer encountered this individual at 1455 Market St on 2/12/2026 at 11:53 PM.',
      'Officer observed the following behaviors: fumbling for ID or belongings; poor hand-eye coordination.',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
    ].join('\n'));
  });

  it('includes drug use and voluntary transport lines when provided', () => {
    const narrative = buildDeflectionNarrative({
      incident: {
        addressLine1: '1455 Market St',
        arrestedAt: '2026-02-12T23:53:00Z',
      },
      observedBehaviorNames: [
        'fumbling for ID or belongings',
      ],
      drugUseEvidence: true,
      drugType: 'CNS_DEPRESSANTS',
      volunteeredToReset: true,
    });

    expect(narrative).toBe([
      'Officer encountered this individual at 1455 Market St on 2/12/2026 at 11:53 PM.',
      'Officer observed the following behaviors: fumbling for ID or belongings.',
      'Officer observed that drugs were recently used: CNS Depressants.',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
      'Person volunteered to be taken to RESET.',
    ].join('\n'));
  });

  it('includes negative voluntary transport line when set to no', () => {
    const narrative = buildDeflectionNarrative({
      incident: {
        addressLine1: '1455 Market St',
        arrestedAt: '2026-02-12T23:53:00Z',
      },
      observedBehaviorNames: [
        'poor hand-eye coordination',
      ],
      volunteeredToReset: false,
    });

    expect(narrative).toBe([
      'Officer encountered this individual at 1455 Market St on 2/12/2026 at 11:53 PM.',
      'Officer observed the following behaviors: poor hand-eye coordination.',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
      'Person did not volunteer to be taken to RESET.',
    ].join('\n'));
  });

  it('uses [DETAILS MISSING] placeholders for missing incident details', () => {
    const narrative = buildDeflectionNarrative({
      incident: {},
      observedBehaviorNames: ['unable to follow simple physical instructions'],
      drugUseEvidence: true,
      volunteeredToReset: false,
    });

    expect(narrative).toBe([
      'Officer encountered this individual at [DETAILS MISSING] on [DETAILS MISSING] at [DETAILS MISSING].',
      'Officer observed the following behaviors: unable to follow simple physical instructions.',
      '[DETAILS MISSING ON DRUG USE AND TYPE]',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
      'Person did not volunteer to be taken to RESET.',
    ].join('\n'));
  });
});
