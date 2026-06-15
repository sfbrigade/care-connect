import { describe, expect, it, vi } from 'vitest';

import { getSfpdDocuments } from './sfpdDocuments';

const actions = {
  view647fForm: vi.fn(),
  download647fForm: vi.fn(),
};

function buildDeflection (overrides = {}) {
  return {
    subjectStatus: 'AWAITING_INTAKE',
    transferredAt: '2026-06-10T19:00:00.000Z',
    deflectionDocuments: [{
      formId: '647f',
      updatedAt: '2026-06-10T19:15:00.000Z',
    }],
    ...overrides,
  };
}

describe('getSfpdDocuments', () => {
  it('shows 647(f) only after custody transfer and generated document availability', () => {
    expect(getSfpdDocuments({
      deflection: buildDeflection({ transferredAt: null }),
      ...actions,
    })).toEqual([]);

    expect(getSfpdDocuments({
      deflection: buildDeflection({ deflectionDocuments: [] }),
      ...actions,
    })).toEqual([]);

    expect(getSfpdDocuments({
      deflection: buildDeflection({ subjectStatus: 'ONSITE_AWAITING_TRANSFER' }),
      ...actions,
    })).toEqual([]);

    expect(getSfpdDocuments({
      deflection: buildDeflection(),
      ...actions,
    })).toEqual([{
      id: '647f',
      title: '647(f)',
      updatedAt: '2026-06-10T19:15:00.000Z',
      actions: {
        view: actions.view647fForm,
        download: actions.download647fForm,
      },
    }]);
  });
});
