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
            incidents={[]}
            onCancelHoldClick={vi.fn()}
            onEditIncidentClick={vi.fn()}
            onHandoffClick={vi.fn()}
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
  it('shows the empty state when there are no incidents with holds', () => {
    renderHoldsActive();

    expect(screen.getByText('No active holds.')).toBeInTheDocument();
  });

  it('renders holds grouped by incident', () => {
    renderHoldsActive({
      incidents: [
        {
          id: 10,
          addressLine1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          canEdit: true,
          canHandoff: false,
          deflections: [
            { id: 1, subjectStatus: 'DETAINED', status: 'ACTIVE', createdAt: '2026-03-14T15:00:00Z' },
          ],
        },
      ],
    });

    expect(screen.queryByText('No active holds.')).not.toBeInTheDocument();
  });
});
