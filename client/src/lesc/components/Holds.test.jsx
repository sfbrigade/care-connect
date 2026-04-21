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
  mockDeflectionCreate,
  mockIncidentLeft,
  mockIncidentExtend,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockBedTypesIndex: vi.fn(),
  mockActiveIncident: vi.fn(),
  mockDeflectionsList: vi.fn(),
  mockDeflectionCreate: vi.fn(),
  mockIncidentLeft: vi.fn(),
  mockIncidentExtend: vi.fn(),
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
      create: mockDeflectionCreate,
    },
    incidents: {
      left: mockIncidentLeft,
      extend: mockIncidentExtend,
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
      permissions: {
        isCreator: true,
        canExtend: true,
        canArrive: false,
        canLeave: true,
        canCancelIncident: true,
        canEditIncident: true,
        canCreateHold: true,
        canHandoff: true,
        incidentDetailsComplete: true,
      },
      totalActiveHolds: 1,
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
  mockIncidentExtend.mockResolvedValue({
    data: [],
  });
  mockDeflectionCreate.mockResolvedValue({
    data: {
      id: 89,
      incidentId: 55,
      subjectId: null,
      status: 'ACTIVE',
      subjectStatus: 'DETAINED',
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

  it('extends active holds from the footer overflow menu', async () => {
    mockDeflectionsList.mockImplementation(({ incidentId, facilityId, active, subjectStatus }) => {
      if (incidentId === 55 && active === true) {
        return Promise.resolve({
          data: [{
            id: 88,
            incidentId: 55,
            subjectId: 'subject-1',
            status: 'ACTIVE',
            subjectStatus: 'DETAINED',
          }],
        });
      }
      if (facilityId === 1 && active === false) {
        return Promise.resolve({ data: [] });
      }
      if (facilityId === 1 && active === true && subjectStatus) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByText('Extend active holds'));

    await waitFor(() => {
      expect(mockIncidentExtend).toHaveBeenCalledWith(55);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'All active holds have been reset to 60 minutes.',
        'success'
      );
    });
  });

  it('delays placing an additional hold and then shows a 90 minute success toast', async () => {
    mockActiveIncident.mockResolvedValue({
      data: {
        id: 55,
        arrivedAt: null,
        leftAt: null,
        addressLine1: '1001 Polk St',
        createdById: 1,
        permissions: {
          isCreator: true,
          canExtend: true,
          canArrive: true,
          canLeave: true,
          canCancelIncident: true,
          canEditIncident: true,
          canCreateHold: true,
          canHandoff: true,
          incidentDetailsComplete: true,
        },
        totalActiveHolds: 1,
      },
    });
    mockDeflectionsList.mockImplementation(({ incidentId, facilityId, active, subjectStatus }) => {
      if (incidentId === 55 && active === true) {
        return Promise.resolve({
          data: [{
            id: 88,
            incidentId: 55,
            subjectId: 'subject-1',
            status: 'ACTIVE',
            subjectStatus: 'DETAINED',
            subject: {
              firstName: 'Jane',
              lastName: 'Doe',
            },
          }],
        });
      }
      if (facilityId === 1 && active === false) {
        return Promise.resolve({ data: [] });
      }
      if (facilityId === 1 && active === true && subjectStatus) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderHolds();

    expect(await screen.findByText('Hold 88')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Hold a bedtype\.chair/i }));

    expect(await screen.findByRole('button', { name: /Placing hold/i })).toBeInTheDocument();
    expect(mockDeflectionCreate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockDeflectionCreate).toHaveBeenCalledWith({
        facilityId: 1,
        incidentId: 55,
        bedTypeId: 99,
      });
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Hold placed',
        'success',
        4000,
        '1 bedtype.chair reserved. Hold expires in 90 minutes.'
      );
    });
  });

  it('navigates to incident details immediately for the first hold', async () => {
    mockActiveIncident.mockResolvedValue({ data: null });

    renderHolds();

    const holdButton = await screen.findByRole('button', { name: /Hold a bedtype\.chair/i });

    await waitFor(() => {
      expect(holdButton).not.toBeDisabled();
    });

    fireEvent.click(holdButton);

    expect(mockNavigate).toHaveBeenCalledWith('/incident?bedTypeId=99');
    expect(screen.queryByRole('button', { name: /Placing hold/i })).not.toBeInTheDocument();
    expect(mockDeflectionCreate).not.toHaveBeenCalled();
  });

  it('navigates to incident details from the incident overflow menu', async () => {
    mockDeflectionsList.mockImplementation(({ incidentId, facilityId, active, subjectStatus }) => {
      if (incidentId === 55 && active === true) {
        return Promise.resolve({
          data: [{
            id: 88,
            incidentId: 55,
            subjectId: 'subject-1',
            status: 'ACTIVE',
            subjectStatus: 'DETAINED',
          }],
        });
      }
      if (facilityId === 1 && active === false) {
        return Promise.resolve({ data: [] });
      }
      if (facilityId === 1 && active === true && subjectStatus) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: 'Incident actions' }));
    fireEvent.click(await screen.findByText('Edit details'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/incident');
    });
  });
});
