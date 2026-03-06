import { describe, expect, it } from 'vitest';

import { buildDeflectionUpdatePayload, composeBehavior } from './deflectionBehavior';

describe('deflectionBehavior', () => {
  it('combines generated narrative and additions in order', () => {
    const result = composeBehavior(
      'Officer observed poor balance.',
      'Subject also slurred speech during contact.'
    );

    expect(result).toBe([
      'Officer observed poor balance.',
      '',
      'Subject also slurred speech during contact.',
    ].join('\n'));
  });

  it('persists additions-only narrative when no observations are selected', () => {
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: '',
      behaviorAdditions: 'Additional context only.',
      deflectionDetails: [],
    });

    expect(payload.behavior).toBe('Additional context only.');
    expect(payload.behaviorAdditions).toBe('Additional context only.');
  });

  it('regenerates base narrative and keeps additions appended', () => {
    const additions = 'Subject required two-person assist to ambulate.';
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: 'Officer observed poor hand-eye coordination.',
      behaviorAdditions: additions,
      deflectionDetails: ['b'],
    });

    expect(payload.behavior).toBe([
      'Officer observed poor hand-eye coordination.',
      '',
      additions,
    ].join('\n'));
  });

  it('creates payload with behavior and sorted deflection details', () => {
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: 'Generated text',
      behaviorAdditions: 'Manual additions',
      deflectionDetails: ['10', '2', '1'],
    });

    expect(payload).toEqual({
      behavior: ['Generated text', '', 'Manual additions'].join('\n'),
      behaviorAdditions: 'Manual additions',
      deflectionDetails: ['1', '10', '2'],
    });
  });

  it('stores manual additions as null when textarea is empty', () => {
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: 'Generated text',
      behaviorAdditions: '   ',
      deflectionDetails: ['a'],
    });

    expect(payload).toEqual({
      behavior: 'Generated text',
      behaviorAdditions: null,
      deflectionDetails: ['a'],
    });
  });
});
