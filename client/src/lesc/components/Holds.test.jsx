import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import React from 'react';
import { DateTime } from 'luxon';

const {
  mockNavigate,
  mockShowToast,
  mockBedTypesIndex,
  mockActiveIncident,
  mockDeflectionsList,
  mockIncidentsCreate,
  mockIncidentLeft,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockBedTypesIndex: vi.fn(),
  mockActiveIncident: vi.fn(),
  mockDeflectionsList: vi.fn(),
  mockIncidentsCreate: vi.fn(),
  mockIncidentLeft: vi.fn(),
}));

vi.mock('@unhead/react', () => ({
  Head: function HeadMock ({ children }) {
    return <>{children}</>;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key === 'bedType.CHAIR' ? 'Chair' : key,
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
        index: () => Promise.resolve({ data: [{ id: 'bed-1', type: 'CHAIR', available: 1 }] }),
      },
      activeIncident: () => Promise.resolve({ data: null }),
    },
    deflections: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    incidents: {
      create: mockIncidentsCreate,
      left: mockIncidentLeft,
    },
  },
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

vi.mock('./HoldsHistory', () => ({
  default: function HoldsHistoryMock () {
    return null;
  },
}));

vi.mock('./HoldsActive', () => ({
  default: function HoldsActiveMock () {
    return null;
  },
}));

vi.mock('./CancelHoldModal', () => ({
  default: function CancelHoldModalMock () {
    return null;
  },
}));

vi.mock('./Facility', () => ({
  default: function FacilityMock ({ onHoldClick }) {
    return <button type='button' onClick={onHoldClick}>Hold a chair</button>;
  },
}));

let Holds;

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
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

beforeAll(async () => {
  Holds = (await import('./Holds')).default;
});

vi.mock('@/hooks/useSessionState', () => ({
  default: () => ['active', vi.fn()],
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

describe('Holds', () => {
  it('creates an incident with arrestedAt populated when starting a hold with no active incident', async () => {
    renderHolds();

    fireEvent.click(await screen.findByRole('button', { name: /Hold a chair/i }));

    await waitFor(() => {
      expect(mockIncidentsCreate).toHaveBeenCalledTimes(1);
    });

    const [payload] = mockIncidentsCreate.mock.calls.at(-1);
    expect(payload.facilityId).toBe('facility-1');
    expect(payload.arrestedAt).toBeTruthy();
    expect(DateTime.fromISO(payload.arrestedAt).isValid).toBe(true);
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
