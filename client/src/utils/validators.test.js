import { describe, expect, it } from 'vitest';

import { validateSubstance } from './validators';

describe('validateSubstance', () => {
  it('returns no errors when all fields are valid (drugUseEvidence false branch)', () => {
    const errors = validateSubstance({
      narcoticsSubstance: false,
      narcoticsParaphernalia: false,
      drugUseEvidence: false,
      drugType: null,
    });
    expect(errors).toEqual({});
  });

  it('returns no errors when all fields are valid (drugUseEvidence true branch)', () => {
    const errors = validateSubstance({
      narcoticsSubstance: false,
      narcoticsParaphernalia: false,
      drugUseEvidence: true,
      drugType: 'FENTANYL',
    });
    expect(errors).toEqual({});
  });

  it('returns a field-level error on narcoticsSubstance when unanswered', () => {
    const errors = validateSubstance({
      narcoticsSubstance: null,
      narcoticsParaphernalia: false,
      drugUseEvidence: false,
      drugType: null,
    });
    expect(errors).toHaveProperty('narcoticsSubstance');
  });

  it('returns a field-level error on drugUseEvidence when unanswered', () => {
    const errors = validateSubstance({
      narcoticsSubstance: false,
      narcoticsParaphernalia: false,
      drugUseEvidence: null,
      drugType: null,
    });
    expect(errors).toHaveProperty('drugUseEvidence');
  });

  it('returns a field-level error on drugType when drugUseEvidence is true but drugType is missing', () => {
    const errors = validateSubstance({
      narcoticsSubstance: false,
      narcoticsParaphernalia: false,
      drugUseEvidence: true,
      drugType: null,
    });
    expect(errors).toHaveProperty('drugType');
  });

  it('returns field-level errors for all three boolean groups when all are unanswered', () => {
    const errors = validateSubstance({
      narcoticsSubstance: null,
      narcoticsParaphernalia: null,
      drugUseEvidence: null,
      drugType: null,
    });

    expect(errors).toMatchObject({
      narcoticsSubstance: 'Select one',
      narcoticsParaphernalia: 'Select one',
      drugUseEvidence: 'Select one',
    });
  });
});
