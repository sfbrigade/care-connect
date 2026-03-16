import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import SubjectForm from './SubjectForm';

const { mockNavigate, mockShowToast, mockDeflectionGet, mockDeflectionSubject, routeState } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockDeflectionGet: vi.fn(),
  mockDeflectionSubject: vi.fn(),
  routeState: {
    pathname: '/holds/123/subject',
    search: 'isNew=true',
    params: { id: '123' },
  },
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
    useLocation: () => ({ pathname: routeState.pathname }),
    useParams: () => routeState.params,
    useSearchParams: () => [new URLSearchParams(routeState.search)],
  };
});

vi.mock('@/Api', () => ({
  default: {
    facilities: {
      activeIncident: () => Promise.resolve({ data: { id: 'incident-1' } }),
    },
    deflections: {
      get: mockDeflectionGet,
      subject: mockDeflectionSubject,
    },
  },
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: { id: 'facility-1' },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/components/AddressAutocomplete', () => ({
  default: function AddressAutocompleteMock () {
    return <div data-testid='address-autocomplete' />;
  },
}));

vi.mock('@/components/Header', () => ({
  default: function HeaderMock ({ children }) {
    return <div>{children}</div>;
  },
}));

vi.mock('@/components/IconButtonLink', () => ({
  default: function IconButtonLinkMock () {
    return <button type='button'>Back</button>;
  },
}));

vi.mock('./custody/File647fModal', () => ({
  default: function File647fModalMock () {
    return null;
  },
}));

function renderSubjectForm () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <SubjectForm />
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  window.sessionStorage.clear();
  routeState.pathname = '/holds/123/subject';
  routeState.search = 'isNew=true';
  routeState.params = { id: '123' };
  mockDeflectionSubject.mockResolvedValue({
    data: {
      id: '123',
      subjectId: 'subject-1',
      subject: { firstName: 'John' },
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('SubjectForm', () => {
  it('does not show incomplete hints during first visit after autosave', async () => {
    mockDeflectionGet.mockResolvedValue({
      data: {
        id: '123',
        subjectId: null,
        subject: null,
        narcoticsSubstance: null,
        narcoticsParaphernalia: null,
        drugUseEvidence: null,
        drugType: null,
      },
    });

    renderSubjectForm();

    await screen.findByText('Person details');
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: 'John' } });
    vi.advanceTimersByTime(800);

    await waitFor(() => {
      expect(mockDeflectionSubject).toHaveBeenCalled();
    });

    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Select one')).not.toBeInTheDocument();
  });

  it('shows incomplete hints on re-entry after incomplete data was previously entered', async () => {
    window.sessionStorage.setItem('_session-subject-details-hints-123', 'true');
    mockDeflectionGet.mockResolvedValue({
      data: {
        id: '123',
        subjectId: 'subject-1',
        subject: {
          firstName: 'John',
          lastName: '',
          dateOfBirth: null,
          sex: null,
          race: null,
        },
        narcoticsSubstance: null,
        narcoticsParaphernalia: null,
        drugUseEvidence: null,
        drugType: null,
      },
    });

    renderSubjectForm();

    await screen.findByText('Person details');

    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Select one').length).toBeGreaterThan(0);
  });
});
