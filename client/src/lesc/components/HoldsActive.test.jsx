import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import HoldsActive from './HoldsActive';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

function renderHoldsActive (props) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HoldsActive
            incident={null}
            deflections={[]}
            isFetchingDeflections={false}
            onCancelHoldClick={vi.fn()}
            onEditIncidentClick={vi.fn()}
            onCancelIncidentClick={vi.fn()}
            {...props}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('HoldsActive', () => {
  it('shows the transferred-holds prompt when the officer has arrived and no active holds remain', () => {
    renderHoldsActive({
      incident: {
        id: 10,
        arrivedAt: '2026-03-14T15:15:00.000Z',
        leftAt: null,
      },
      updatedAtMs: new Date('2026-03-14T17:42:00.000Z').getTime(),
    });

    expect(screen.getByTestId('transferred-holds-checkerboard')).toBeInTheDocument();
    expect(screen.getByText(/All holds transferred/)).toBeInTheDocument();
    expect(screen.getByText(/make sure to tap/)).toBeInTheDocument();
  });

  it('falls back to the generic empty state when there is no transferred-holds incident state', () => {
    renderHoldsActive();

    expect(screen.getByText('No active holds.')).toBeInTheDocument();
    expect(screen.queryByText(/All holds transferred/)).not.toBeInTheDocument();
  });
});
