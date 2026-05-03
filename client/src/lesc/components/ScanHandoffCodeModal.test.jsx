import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';

import ScanHandoffCodeModal from './ScanHandoffCodeModal';

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      handoff: vi.fn(),
    },
  },
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@/components/QRScanner', () => ({
  default: function MockQRScanner () {
    return <div>QR Scanner</div>;
  },
}));

function renderModal () {
  return render(
    <MantineProvider>
      <ScanHandoffCodeModal opened onClose={vi.fn()} onSuccess={vi.fn()} />
    </MantineProvider>
  );
}

describe('ScanHandoffCodeModal', () => {
  it('shows the updated manual entry guidance in type code view', () => {
    renderModal();

    fireEvent.click(screen.getByRole('radio', { name: 'Type code' }));

    expect(
      screen.getByText('If scanning is not working, ask the officer for the numerical handoff code.')
    ).toBeInTheDocument();
  });
});
