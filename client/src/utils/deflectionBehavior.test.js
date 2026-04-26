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

  it('persists narrative-only when no generated text exists', () => {
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: '',
      behaviorNarrative: 'Additional context only.',
      chargeType: 'HS_11550',
    });

    expect(payload.behavior).toBe('Additional context only.');
    expect(payload.behaviorNarrative).toBe('Additional context only.');
    expect(payload.chargeType).toBe('HS_11550');
  });

  it('appends officer narrative to generated text', () => {
    const narrative = 'Subject required two-person assist to ambulate.';
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: 'Officer observed poor hand-eye coordination.',
      behaviorNarrative: narrative,
      chargeType: 'RWS_647F',
    });

    expect(payload.behavior).toBe([
      'Officer observed poor hand-eye coordination.',
      '',
      narrative,
    ].join('\n'));
  });

  it('stores behaviorNarrative as null when textarea is empty', () => {
    const payload = buildDeflectionUpdatePayload({
      generatedNarrative: 'Generated text',
      behaviorNarrative: '   ',
      chargeType: null,
    });

    expect(payload).toEqual({
      behavior: 'Generated text',
      behaviorNarrative: null,
      chargeType: null,
    });
  });
});
