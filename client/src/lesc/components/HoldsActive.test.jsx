import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import HoldsActive from './HoldsActive';

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
    expect(screen.getByText('All holds transferred. When you leave RESET, make sure to tap "I\'ve left".')).toBeInTheDocument();
    expect(screen.getByText('Last updated: 5:42 PM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extend all holds' })).toBeDisabled();
    expect(screen.queryByText('You don\'t have any active holds')).not.toBeInTheDocument();
  });

  it('falls back to the generic empty state when there is no transferred-holds incident state', () => {
    renderHoldsActive();

    expect(screen.getByText('You don\'t have any active holds')).toBeInTheDocument();
    expect(screen.queryByTestId('transferred-holds-checkerboard')).not.toBeInTheDocument();
  });
});
