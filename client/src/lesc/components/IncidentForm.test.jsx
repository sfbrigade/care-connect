import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockNavigate, mockShowToast, mockActiveIncident, routeState } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockActiveIncident: vi.fn(),
  routeState: {
    search: 'isNew=true',
  },
}));

vi.mock('@unhead/react', () => ({
  Head: function HeadMock ({ children }) {
    return <>{children}</>;
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(routeState.search)],
  };
});

vi.mock('../../Api', () => ({
  default: {
    facilities: {
      activeIncident: mockActiveIncident,
    },
    deflections: {
      list: () => Promise.resolve({ data: [] }),
    },
    incidents: {
      update: vi.fn(),
      create: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

vi.mock('../../FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: { id: 'facility-1' },
  }),
}));

vi.mock('../../components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('../../components/AddressAutocomplete', () => ({
  default: function AddressAutocompleteMock () {
    return <div data-testid='address-autocomplete' />;
  },
}));

vi.mock('./CancelIncidentModal', () => ({
  default: function CancelIncidentModalMock () {
    return null;
  },
}));

vi.mock('../../components/Header', () => ({
  default: function HeaderMock ({ children }) {
    return <div>{children}</div>;
  },
}));

vi.mock('../../components/IconButtonLink', () => ({
  default: function IconButtonLinkMock () {
    return <button type='button'>Back</button>;
  },
}));

vi.mock('../../utils/geocoding', () => ({
  getCurrentLocationAddress: () => Promise.resolve({}),
}));

vi.mock('../../utils/format', () => ({
  formatAddress: () => '',
}));

let IncidentForm;

function renderIncidentForm () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <IncidentForm />
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  routeState.search = 'isNew=true';
});

afterEach(() => {
  cleanup();
});

beforeAll(async () => {
  IncidentForm = (await import('./IncidentForm')).default;
});

describe('IncidentForm', () => {
  it('does not show incomplete hints on first new-incident visit', async () => {
    mockActiveIncident.mockResolvedValue({
      data: {
        id: 14,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        arrestedAt: new Date().toISOString(),
        encounteredVia: '',
        cadNumber: '',
        supervisorBadgeNumber: '',
      },
    });

    renderIncidentForm();

    await screen.findByText('Start an incident');
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Select one')).not.toBeInTheDocument();
  });
});
