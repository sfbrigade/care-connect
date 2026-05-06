import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import Care from './Care';

const {
  mockBedTypesIndex,
  mockDeflectionsList,
  mockShowToast,
  mockNavigate,
} = vi.hoisted(() => ({
  mockBedTypesIndex: vi.fn(),
  mockDeflectionsList: vi.fn(),
  mockShowToast: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    facilities: {
      bedTypes: {
        index: mockBedTypesIndex,
      },
    },
    deflections: {
      list: mockDeflectionsList,
    },
  },
}));

vi.mock('@/AuthContext', () => ({
  useAuthContext: () => ({
    user: {
      roles: ['CARE', 'FACILITY_ADMIN'],
    },
  }),
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: {
      id: 7,
      status: 'OPEN',
      bedTypes: [{ id: 1, available: 2, holds: 2, occupied: 2, type: 'CHAIR' }],
    },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/hooks/useSessionState', () => ({
  default: () => ['in-custody', vi.fn()],
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function renderCare () {
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
          <Care />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  mockBedTypesIndex.mockResolvedValue({
    data: [{ id: 1, available: 17, holds: 2, occupied: 2, type: 'CHAIR' }],
  });

  mockDeflectionsList.mockImplementation(({ subjectStatus }) => {
    if (subjectStatus === 'IN_MEDICAL_INTAKE,IN_CHAIR') {
      return Promise.resolve({
        data: [
          { id: 1, subjectStatus: 'IN_MEDICAL_INTAKE' },
          { id: 2, subjectStatus: 'IN_CHAIR' },
        ],
      });
    }

    if (subjectStatus === 'RELEASED,EXITED') {
      return Promise.resolve({
        data: [
          { id: 3, subjectStatus: 'RELEASED' },
          { id: 4, subjectStatus: 'EXITED' },
        ],
      });
    }

    if (subjectStatus === 'DETAINED,ONSITE_AWAITING_TRANSFER') {
      return Promise.resolve({
        data: [
          { id: 5, subjectStatus: 'DETAINED' },
          { id: 6, subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
        ],
      });
    }

    return Promise.resolve({ data: [] });
  });
});

afterEach(() => {
  cleanup();
});

describe('Care', () => {
  it('shows the shared chair availability summary with manage capacity action', async () => {
    renderCare();

    expect(await screen.findByText('17 chairs available')).toBeInTheDocument();
    expect(screen.getByText('2 reserved')).toBeInTheDocument();
    expect(screen.getByText('2 occupied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage capacity' })).toBeInTheDocument();
  });
});
