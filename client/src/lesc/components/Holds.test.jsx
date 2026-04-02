import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import Holds from './Holds';

const {
  mockNavigate,
  mockShowToast,
  mockBedTypesIndex,
  mockActiveIncident,
  mockDeflectionsList,
  mockIncidentLeft,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockBedTypesIndex: vi.fn(),
  mockActiveIncident: vi.fn(),
  mockDeflectionsList: vi.fn(),
  mockIncidentLeft: vi.fn(),
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
    facilities: {
      bedTypes: {
        index: mockBedTypesIndex,
      },
      activeIncident: mockActiveIncident,
    },
    deflections: {
      list: mockDeflectionsList,
    },
    incidents: {
      left: mockIncidentLeft,
    },
  },
}));

vi.mock('@/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'test-user-1' },
  }),
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: {
      id: 1,
      name: 'RESET',
      status: 'OPEN',
      bedTypes: [{ id: 99, available: 2, type: 'CHAIR' }],
    },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/hooks/useSessionState', () => ({
  default: (key, defaultValue) => [defaultValue, vi.fn()],
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function renderHolds () {
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
          <Holds />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBedTypesIndex.mockResolvedValue({
    data: [{ id: 99, available: 2, type: 'CHAIR' }],
  });
  mockActiveIncident.mockResolvedValue({
    data: {
      id: 55,
      arrivedAt: '2026-03-14T15:00:00.000Z',
      leftAt: null,
      addressLine1: '1001 Polk St',
      createdById: 1,
    },
  });
  mockDeflectionsList.mockImplementation(({ incidentId, facilityId, active, subjectStatus }) => {
    if (incidentId === 55 && active === true) {
      return Promise.resolve({ data: [] });
    }
    if (facilityId === 1 && active === false) {
      return Promise.resolve({ data: [] });
    }
    if (facilityId === 1 && active === true && subjectStatus) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
  mockIncidentLeft.mockResolvedValue({
    data: {
      id: 55,
      leftAt: '2026-03-14T16:35:00.000Z',
    },
  });
});

afterEach(() => {
  cleanup();
});

describe('Holds', () => {
  it('shows the departure toast after tapping "I\'ve left"', async () => {
    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'I\'ve left' }));

    await waitFor(() => {
      expect(mockIncidentLeft).toHaveBeenCalledWith(55);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'You\'ve left RESET',
        'success',
        4000,
        expect.stringMatching(/Departed at/)
      );
    });
  });
});
