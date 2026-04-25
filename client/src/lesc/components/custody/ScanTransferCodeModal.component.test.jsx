import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import ScanTransferCodeModal from './ScanTransferCodeModal';

const {
  mockDeflectionsTransfer,
  mockShowToast,
} = vi.hoisted(() => ({
  mockDeflectionsTransfer: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      transfer: mockDeflectionsTransfer,
    },
  },
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: {
      name: 'LESC',
    },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/components/ScanCodeModal', async () => {
  const React = await import('react');
  return {
    default: ({ onManualSubmitCodes }) => (
      <button type='button' onClick={() => onManualSubmitCodes(['not-a-code'])}>
        submit invalid codes
      </button>
    ),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ScanTransferCodeModal', () => {
  it('does not call success when manual code submission has no successful transfers', () => {
    const onSuccess = vi.fn();

    render(
      <ScanTransferCodeModal
        opened
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit invalid codes/i }));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockDeflectionsTransfer).not.toHaveBeenCalled();
  });
});
