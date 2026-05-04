import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Facility from './Facility';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

function renderFacility (props = {}) {
  return render(
    <MantineProvider>
      <Facility
        facility={{
          name: 'RESET',
          status: 'OPEN_ACCEPTING',
          addressLine1: '444 6th St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94103',
          phone: null,
        }}
        bedTypes={[{ id: 99, type: 'CHAIR', available: 1 }]}
        atFacility={false}
        arrivedAt={null}
        canArrive={false}
        canLeave={false}
        onArrivedClick={vi.fn()}
        onLeftClick={vi.fn()}
        isArrivalPending={false}
        {...props}
      />
    </MantineProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('Facility', () => {
  it('shows the locked transfer-code hint before arrival when a single hold is ready', () => {
    renderFacility({
      canArrive: true,
      transferCodeStatus: {
        icon: 'locked',
        label: 'Tap to unlock transfer code',
      },
    });

    expect(screen.getByTestId('transfer-code-status')).toBeInTheDocument();
    expect(screen.getByText('Tap to unlock transfer code')).toBeInTheDocument();
  });

  it('shows the ready transfer-code hint after arrival', () => {
    renderFacility({
      atFacility: true,
      canLeave: true,
      arrivedAt: '2026-05-01T15:00:00.000Z',
      transferCodeStatus: {
        icon: 'ready',
        label: 'Transfer codes ready',
      },
    });

    expect(screen.getByText('Transfer codes ready')).toBeInTheDocument();
    expect(screen.queryByText(/Arrived at/i)).not.toBeInTheDocument();
  });

  it('falls back to the arrival timestamp when no transfer-code hint is available', () => {
    renderFacility({
      atFacility: true,
      canLeave: true,
      arrivedAt: '2026-05-01T15:00:00.000Z',
      transferCodeStatus: null,
    });

    expect(screen.queryByTestId('transfer-code-status')).not.toBeInTheDocument();
    expect(screen.getByText(/Arrived at/i)).toBeInTheDocument();
  });
});
