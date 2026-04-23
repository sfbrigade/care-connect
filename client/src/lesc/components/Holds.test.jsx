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
  mockMyHolds,
  mockDeflectionsList,
  mockFacilityLeft,
  mockDeflectionsExtend,
  mockIncidentCreate,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockBedTypesIndex: vi.fn(),
  mockMyHolds: vi.fn(),
  mockDeflectionsList: vi.fn(),
  mockFacilityLeft: vi.fn(),
  mockDeflectionsExtend: vi.fn(),
  mockIncidentCreate: vi.fn(),
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
      myHolds: mockMyHolds,
      left: mockFacilityLeft,
    },
    deflections: {
      list: mockDeflectionsList,
      extend: mockDeflectionsExtend,
    },
    incidents: {
      create: mockIncidentCreate,
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
      addressLine1: '444 6th St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      phone: null,
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

const mockMyHoldsData = {
  atFacility: true,
  canArrive: false,
  canLeave: true,
  canExtend: true,
  canCreateHold: true,
  activeIncidentId: 55,
  incidents: [
    {
      id: 55,
      addressLine1: '1001 Polk St',
      city: 'San Francisco',
      state: 'CA',
      createdById: 'test-user-1',
      canEdit: true,
      canHandoff: true,
      deflections: [],
    },
  ],
};

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
  mockMyHolds.mockResolvedValue({
    data: mockMyHoldsData,
  });
  mockDeflectionsList.mockResolvedValue({ data: [] });
  mockFacilityLeft.mockResolvedValue({ data: { ok: true } });
  mockDeflectionsExtend.mockResolvedValue({ data: [] });
  mockIncidentCreate.mockResolvedValue({
    data: {
      id: 56,
      facilityId: 1,
    },
  });
});

afterEach(() => {
  cleanup();
});

describe('Holds', () => {
  it('shows centered facility contact details without the facility name in the header', async () => {
    renderHolds();

    expect(await screen.findByRole('heading', { name: /2 .*available/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '444 6th St' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '(415) 555-7890' })).toBeInTheDocument();
    expect(screen.queryByText('RESET')).not.toBeInTheDocument();
  });

  it('shows the departure toast after tapping "I\'ve left"', async () => {
    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'I\'ve left' }));

    await waitFor(() => {
      expect(mockFacilityLeft).toHaveBeenCalledWith(1);
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

  it('extends active holds from the footer overflow menu', async () => {
    mockMyHolds.mockResolvedValue({
      data: {
        ...mockMyHoldsData,
        incidents: [
          {
            ...mockMyHoldsData.incidents[0],
            deflections: [{
              id: 88,
              incidentId: 55,
              subjectId: 'subject-1',
              status: 'ACTIVE',
              subjectStatus: 'DETAINED',
              createdAt: '2026-03-14T15:00:00Z',
            }],
          },
        ],
      },
    });

    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByText('Extend active holds'));

    await waitFor(() => {
      expect(mockDeflectionsExtend).toHaveBeenCalledWith([88]);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'All active holds have been reset to 90 minutes.',
        'success'
      );
    });
  });

  it('creates a blank incident when placing the first hold (no activeIncidentId)', async () => {
    mockMyHolds.mockResolvedValue({
      data: {
        ...mockMyHoldsData,
        activeIncidentId: null,
        incidents: [],
      },
    });

    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: /Hold a bedtype\.chair/i }));

    await waitFor(() => {
      expect(mockIncidentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 1,
          cadNumber: null,
          caseNumber: null,
          arrestedAt: expect.any(String),
        }),
        { bedTypeId: 99 }
      );
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/incident'));
  });

  it('routes add-details tap through incident confirmation when incident details are incomplete', async () => {
    mockMyHolds.mockResolvedValue({
      data: {
        ...mockMyHoldsData,
        activeIncidentId: 55,
        incidents: [{
          id: 55,
          // addressLine1 missing → isValidIncident returns false
          addressLine1: null,
          city: null,
          state: null,
          arrestedAt: null,
          encounteredVia: null,
          cadNumber: null,
          caseNumber: null,
          supervisorBadgeNumber: null,
          createdById: 'test-user-1',
          canEdit: true,
          canHandoff: false,
          deflections: [{
            id: 88,
            incidentId: 55,
            subjectId: null,
            status: 'ACTIVE',
            subjectStatus: 'DETAINED',
            createdAt: '2026-03-14T15:00:00Z',
          }],
        }],
      },
    });

    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'Add Details' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/incident?next=${encodeURIComponent('/holds/88/subject?isNew=true')}`
      );
    });
  });

  it('navigates to incident details from the incident overflow menu', async () => {
    mockMyHolds.mockResolvedValue({
      data: {
        ...mockMyHoldsData,
        incidents: [
          {
            ...mockMyHoldsData.incidents[0],
            deflections: [{
              id: 88,
              incidentId: 55,
              subjectId: 'subject-1',
              status: 'ACTIVE',
              subjectStatus: 'DETAINED',
              createdAt: '2026-03-14T15:00:00Z',
            }],
          },
        ],
      },
    });

    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'Incident actions' }));
    fireEvent.click(await screen.findByText('Edit details'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/incident/55');
    });
  });
});
