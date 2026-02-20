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

  it('uses [ADD MANUALLY] placeholders for missing incident details', () => {
    const narrative = buildDeflectionNarrative({
      incident: {},
      observedBehaviorNames: ['unable to follow simple physical instructions'],
    });

    expect(narrative).toBe([
      'Officer encountered this individual at [ADD MANUALLY] on [ADD MANUALLY] at [ADD MANUALLY].',
      'Officer observed the following behaviors: unable to follow simple physical instructions.',
      'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
    ].join('\n'));
  });
});

