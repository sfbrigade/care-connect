import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';

import Hold from './Hold';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key === 'sex.FEMALE' ? 'Female' : key,
  }),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      cancelReasons: {
        get: vi.fn(),
      },
    },
  },
}));

function renderHold (props) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <Hold
          deflection={{
            id: 10,
            incidentId: 7,
            status: 'ACTIVE',
            subjectId: 22,
            subjectStatus: 'DETAINED',
            createdAt: '2026-03-14T15:00:00.000Z',
            subject: {
              firstName: 'Person',
              lastName: 'X',
              sex: 'FEMALE',
              dateOfBirth: '1982-03-14',
            },
          }}
          onDetailsClick={vi.fn()}
          {...props}
        />
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

describe('Hold', () => {
  it('shows a transferred label and checkerboard for transferred holds', () => {
    renderHold({
      deflection: {
        id: 10,
        incidentId: 7,
        status: 'ACTIVE',
        subjectId: 22,
        subjectStatus: 'AWAITING_INTAKE',
        createdAt: '2026-03-14T15:00:00.000Z',
        subject: {
          firstName: 'Person',
          lastName: 'X',
          sex: 'FEMALE',
          dateOfBirth: '1982-03-14',
        },
      },
    });

    expect(screen.getByText('Transferred')).toBeInTheDocument();
    expect(screen.getByTestId('transferred-hold-checkerboard')).toBeInTheDocument();
    expect(screen.queryByText(/Transfer code:/)).not.toBeInTheDocument();
  });

  it('hides the checkerboard and view-details action for transferred holds in history', () => {
    renderHold({
      isHistory: true,
      deflection: {
        id: 10,
        incidentId: 7,
        status: 'ACTIVE',
        subjectId: 22,
        subjectStatus: 'AWAITING_INTAKE',
        createdAt: '2026-03-14T15:00:00.000Z',
        subject: {
          firstName: 'Person',
          lastName: 'X',
          sex: 'FEMALE',
          dateOfBirth: '1982-03-14',
        },
      },
    });

    expect(screen.getByText('Transferred')).toBeInTheDocument();
    expect(screen.queryByTestId('transferred-hold-checkerboard')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Details' })).not.toBeInTheDocument();
  });

  it('shows the QR code transfer area before custody transfer', () => {
    renderHold({
      deflection: {
        id: 10,
        incidentId: 7,
        status: 'ACTIVE',
        subjectId: 22,
        subjectStatus: 'ONSITE_AWAITING_TRANSFER',
        createdAt: '2026-03-14T15:00:00.000Z',
        subject: {
          firstName: 'Person',
          lastName: 'X',
          sex: 'FEMALE',
          dateOfBirth: '1982-03-14',
        },
      },
    });

    expect(screen.getByText('Transfer code: 10')).toBeInTheDocument();
    expect(screen.queryByTestId('transferred-hold-checkerboard')).not.toBeInTheDocument();
  });
});
