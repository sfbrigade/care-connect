import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CareSubjectForm from './CareSubjectForm';

const { mockGet, mockSubject, mockNavigate, mockShowToast } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSubject: vi.fn(),
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      get: mockGet,
      subject: mockSubject,
    },
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '123' }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/components/Header', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/IconButtonLink', () => ({
  default: () => <a href='/care/123'>back</a>,
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function buildDeflection (overrides = {}) {
  return {
    id: 123,
    narcoticsSubstance: true,
    narcoticsParaphernalia: false,
    drugUseEvidence: true,
    drugType: 'ALCOHOL',
    subject: {
      firstName: 'Marcus',
      lastName: 'Hill',
      middleInitial: 'J',
      dateOfBirth: '1990-01-01T00:00:00.000Z',
      sex: 'MALE',
      race: 'WHITE',
      driverLicense: 'D3478215',
      preferredLanguage: 'PORTUGUESE',
    },
    ...overrides,
  };
}

function renderForm () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <CareSubjectForm />
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: buildDeflection() });
  mockSubject.mockResolvedValue({ data: buildDeflection({ subject: { ...buildDeflection().subject, firstName: 'Mara' } }) });
});

afterEach(() => {
  cleanup();
});

describe('CareSubjectForm', () => {
  it('saves care-editable personal details while preserving substance fields', async () => {
    renderForm();

    const firstName = await screen.findByDisplayValue('Marcus');
    fireEvent.change(firstName, { target: { value: 'Mara' } });
    fireEvent.change(screen.getByDisplayValue('D3478215'), { target: { value: 'D000111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockSubject).toHaveBeenCalledWith('123', expect.objectContaining({
        firstName: 'Mara',
        lastName: 'Hill',
        middleInitial: 'J',
        sex: 'MALE',
        race: 'WHITE',
        driverLicense: 'D000111',
        preferredLanguage: 'PORTUGUESE',
        narcoticsSubstance: true,
        narcoticsParaphernalia: false,
        drugUseEvidence: true,
        drugType: 'ALCOHOL',
      }));
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      'Details updated',
      'success',
      4000,
      'Changes were saved successfully.'
    );
    expect(mockNavigate).toHaveBeenCalledWith('/care/123');
  });

  it('returns to care details and shows a failure toast when save fails', async () => {
    mockSubject.mockRejectedValueOnce(new Error('Save failed'));
    renderForm();

    await screen.findByDisplayValue('Marcus');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Details not updated',
        'error',
        4000,
        'Changes were not saved. Please try again.'
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/care/123');
  });
});
