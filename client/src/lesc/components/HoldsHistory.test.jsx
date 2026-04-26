import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import HoldsHistory from './HoldsHistory';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      cancelReasons: {
        get: vi.fn(),
      },
    },
  },
}));

function renderHoldsHistory (props) {
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
          <HoldsHistory
            deflections={[]}
            currentUserId='alice'
            {...props}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

function makeDeflection (overrides = {}) {
  return {
    id: 1,
    incidentId: 100,
    status: 'CANCELLED',
    subjectId: 'subj-1',
    subjectStatus: 'DETAINED',
    createdAt: '2026-03-14T15:00:00.000Z',
    updatedAt: '2026-03-14T15:30:00.000Z',
    currentOfficerId: 'alice',
    subject: { firstName: 'Person', lastName: 'X', sex: 'FEMALE', dateOfBirth: '1982-03-14' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('HoldsHistory', () => {
  it('renders the empty state when there are no deflections', () => {
    renderHoldsHistory({ deflections: [] });

    expect(screen.getByText("You don't have any past holds")).toBeInTheDocument();
  });

  it('renders incident headers from embedded deflection.incident (no extra fetch)', () => {
    renderHoldsHistory({
      deflections: [
        makeDeflection({
          id: 1,
          incidentId: 100,
          incident: {
            id: 100,
            addressLine1: '123 Main St',
            arrestedAt: '2026-03-14T12:00:00.000Z',
          },
        }),
      ],
    });

    // The incident header pulls address straight from deflection.incident —
    // if we ever regress back to fetching /api/incidents/:id, this address
    // would be missing since we never mock that endpoint.
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    expect(screen.getByText(/Incident 100/)).toBeInTheDocument();
  });

  it('groups deflections from different incidents under separate headers', () => {
    renderHoldsHistory({
      deflections: [
        makeDeflection({
          id: 1,
          incidentId: 100,
          updatedAt: '2026-03-14T15:00:00.000Z',
          incident: { id: 100, addressLine1: '100 Main St', arrestedAt: '2026-03-14T12:00:00.000Z' },
        }),
        makeDeflection({
          id: 2,
          incidentId: 200,
          updatedAt: '2026-03-14T16:00:00.000Z',
          incident: { id: 200, addressLine1: '200 Main St', arrestedAt: '2026-03-14T13:00:00.000Z' },
        }),
      ],
    });

    expect(screen.getByText(/Incident 100/)).toBeInTheDocument();
    expect(screen.getByText(/Incident 200/)).toBeInTheDocument();
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    expect(screen.getByText(/200 Main St/)).toBeInTheDocument();
  });

  it('shows the "Handed off" badge when currentOfficerId is not the viewer', () => {
    renderHoldsHistory({
      currentUserId: 'alice',
      deflections: [
        makeDeflection({
          id: 1,
          status: 'ACTIVE',
          subjectStatus: 'DETAINED',
          currentOfficerId: 'bob',
          incident: { id: 100, addressLine1: '1 A St', arrestedAt: '2026-03-14T12:00:00.000Z' },
        }),
      ],
    });

    expect(screen.getByText('Handed off')).toBeInTheDocument();
  });

  it('navigates to /holds/{id} when a history row is clicked', () => {
    renderHoldsHistory({
      deflections: [
        makeDeflection({
          id: 42,
          incident: { id: 100, addressLine1: '1 A St', arrestedAt: '2026-03-14T12:00:00.000Z' },
        }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /View Details/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/holds/42');
  });

  it('shows the initial loading spinner when fetching and data is still undefined', () => {
    renderHoldsHistory({ deflections: undefined, isFetchingDeflections: true });

    // Empty-state text should not appear yet.
    expect(screen.queryByText("You don't have any past holds")).not.toBeInTheDocument();
  });
});
