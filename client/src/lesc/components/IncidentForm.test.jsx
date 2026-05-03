import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router';

import IncidentForm from './IncidentForm';

const {
  mockIncidentsGet,
  mockIncidentsUpdate,
  mockShowToast,
  mockNavigate,
  mockGetCurrentLocationAddress,
} = vi.hoisted(() => ({
  mockIncidentsGet: vi.fn(),
  mockIncidentsUpdate: vi.fn(),
  mockShowToast: vi.fn(),
  mockNavigate: vi.fn(),
  mockGetCurrentLocationAddress: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
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
    incidents: {
      get: mockIncidentsGet,
      update: mockIncidentsUpdate,
    },
  },
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: { id: 'fac-1', name: 'RESET' },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

vi.mock('@/utils/geocoding', () => ({
  getCurrentLocationAddress: mockGetCurrentLocationAddress,
}));

function buildIncident (overrides = {}) {
  return {
    id: 123,
    facilityId: 'fac-1',
    cadNumber: 'OLD123',
    caseNumber: 'CASE001',
    addressLine1: '1001 Polk St',
    addressLine2: null,
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94109',
    latitude: null,
    longitude: null,
    arrestedAt: '2026-04-27T12:00:00.000Z',
    encounteredVia: 'ON_VIEW',
    supervisorBadgeNumber: '999',
    createdById: 'user-1',
    createdAt: '2026-04-27T12:00:00.000Z',
    updatedById: 'user-1',
    updatedAt: '2026-04-27T12:00:00.000Z',
    ...overrides,
  };
}

function makeQueryClient () {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });
}

function renderForm (queryClient) {
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/incident/123']}>
          <Routes>
            <Route path='/incident/:id' element={<IncidentForm />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

function getCadInput () {
  return screen.getByTestId('incident-cad');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentLocationAddress.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('IncidentForm', () => {
  // Regression test for #749: after saving an incident, re-opening the form
  // (which re-mounts the component against the same React Query cache) must
  // show the values the user just saved, not whatever was in the cache before
  // the save. Without onSubmitMutation.onSuccess seeding ['incidents', :id]
  // with the response, Mantine's one-shot form.initialize() locks the form
  // to the stale cached values and silently drops the fresh ones.
  it('re-mount after save shows the saved value, not stale cache', async () => {
    let serverIncident = buildIncident();
    mockIncidentsGet.mockImplementation(() =>
      Promise.resolve({ data: serverIncident })
    );
    mockIncidentsUpdate.mockImplementation((id, payload) => {
      serverIncident = buildIncident({ ...serverIncident, ...payload });
      return Promise.resolve({ data: serverIncident });
    });

    const queryClient = makeQueryClient();

    // Mount 1: open the form, change CAD number, submit.
    const first = renderForm(queryClient);

    await waitFor(() => {
      expect(getCadInput()).toHaveValue('OLD123');
    });

    fireEvent.change(getCadInput(), { target: { value: 'NEW999' } });
    expect(getCadInput()).toHaveValue('NEW999');

    fireEvent.click(screen.getByTestId('incident-submit-btn'));

    await waitFor(() => {
      expect(mockIncidentsUpdate).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({ cadNumber: 'NEW999' })
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    first.unmount();

    // Mount 2: simulate "Edit incident details" — fresh component, same
    // queryClient. The form must show 'NEW999', not 'OLD123'.
    renderForm(queryClient);

    await waitFor(() => {
      expect(getCadInput()).toHaveValue('NEW999');
    });
  });

  it('shows simplified dispatch helper copy for CAD and case numbers', async () => {
    mockIncidentsGet.mockResolvedValue({ data: buildIncident() });

    renderForm(makeQueryClient());

    await waitFor(() => {
      expect(getCadInput()).toHaveValue('OLD123');
    });

    expect(screen.getAllByText('Obtain from dispatch.')).toHaveLength(2);
  });
});
