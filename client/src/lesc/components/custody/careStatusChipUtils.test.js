import { describe, expect, it } from 'vitest';

import { getCareStatusChip } from './careStatusChipUtils';

describe('getCareStatusChip', () => {
  it('maps IN_MEDICAL_INTAKE to In medical intake chip', () => {
    expect(getCareStatusChip({
      deflection: { subjectStatus: 'IN_MEDICAL_INTAKE' },
      careFooterState: { primaryLabel: 'Update intake status' },
    })).toEqual({ label: 'In medical intake', tone: 'info' });
  });

  it('maps IN_CHAIR to Awaiting legal release chip', () => {
    expect(getCareStatusChip({
      deflection: { subjectStatus: 'IN_CHAIR' },
      careFooterState: {},
    })).toEqual({ label: 'Awaiting legal release', tone: 'info' });
  });

  it('maps RELEASED with Start exit to Ready for exit chip', () => {
    expect(getCareStatusChip({
      deflection: { subjectStatus: 'RELEASED' },
      careFooterState: { primaryLabel: 'Start exit' },
    })).toEqual({ label: 'Ready for exit', tone: 'info' });
  });

  it('maps RELEASED with Finish exit to Still onsite chip', () => {
    expect(getCareStatusChip({
      deflection: { subjectStatus: 'RELEASED' },
      careFooterState: { primaryLabel: 'Finish exit' },
    })).toEqual({ label: 'Still onsite', tone: 'info' });
  });

  it('maps EXITED to Physical exit recorded chip', () => {
    expect(getCareStatusChip({
      deflection: { subjectStatus: 'EXITED' },
      careFooterState: {},
    })).toEqual({ label: 'Physical exit recorded', tone: 'success' });
  });

  it('returns null for unsupported statuses', () => {
    expect(getCareStatusChip({
      deflection: { subjectStatus: 'FAILED_INTAKE' },
      careFooterState: {},
    })).toBeNull();
  });
});
