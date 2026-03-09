import { describe, expect, it } from 'vitest';

import { getCustodyStatusChip } from './custodyStatusChipUtils';

describe('getCustodyStatusChip', () => {
  it.each([
    ['AWAITING_INTAKE', { label: 'Pending safety check', tone: 'info' }],
    ['READY_FOR_INTAKE', { label: 'Ready for medical intake', tone: 'info' }],
    ['ADMITTED', { label: 'In medical intake', tone: 'info' }],
    ['IN_CHAIR', { label: 'Awaiting legal release', tone: 'info' }],
    ['FAILED_INTAKE', { label: 'Refused admission', tone: 'danger' }],
    ['RELEASED', { label: 'Legally released', tone: 'success' }],
    ['EXITED', { label: 'Physical exit recorded', tone: 'success' }],
  ])('maps %s to the expected chip', (status, expectedChip) => {
    expect(getCustodyStatusChip({ subjectStatus: status })).toEqual(expectedChip);
  });

  it('returns null for unknown statuses', () => {
    expect(getCustodyStatusChip({ subjectStatus: 'UNKNOWN_STATUS' })).toBeNull();
  });
});
