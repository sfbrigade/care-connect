import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import React from 'react';
import { MantineProvider } from '@mantine/core';

import CustodyCard from './CustodyCard';

const { mockExitToJail, mockOnExitToJail, mockNavigate, mockSafetyCheck, mockShowToast } = vi.hoisted(() => ({
  mockExitToJail: vi.fn(),
  mockOnExitToJail: vi.fn(),
  mockNavigate: vi.fn(),
  mockSafetyCheck: vi.fn(),
  mockShowToast: vi.fn(),
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

vi.mock('../../../Api', () => ({
  default: {
    deflections: {
      exitToJail: mockExitToJail,
      safetyCheck: mockSafetyCheck,
    },
  },
}));

vi.mock('../../../FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: { id: 42 },
  }),
}));

vi.mock('../../../components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

function buildDeflection (overrides = {}) {
  return {
    id: 123,
    subjectStatus: 'AWAITING_INTAKE',
    subject: {
      firstName: 'John',
      middleInitial: 'D',
      lastName: 'Doe',
      dateOfBirth: '1990-06-15',
      sex: 'MALE',
    },
    ...overrides,
  };
}

function renderCard (deflection) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/custody']}>
          <CustodyCard deflection={deflection} highlighted={false} onExitToJail={mockOnExitToJail} />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mockExitToJail.mockResolvedValue({ data: {} });
  mockSafetyCheck.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
});

describe('CustodyCard', () => {
  it('shows Details and Safety check for awaiting intake', () => {
    renderCard(buildDeflection({ subjectStatus: 'AWAITING_INTAKE' }));

    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Safety check' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Legal release' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfer code:/)).not.toBeInTheDocument();
  });

  it('shows intake-not-completed banner and legal release for failed intake', () => {
    renderCard(buildDeflection({ subjectStatus: 'FAILED_INTAKE' }));

    expect(screen.getByText('Intake not completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legal release' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Safety check' })).not.toBeInTheDocument();
  });

  it('shows qr code and only Details for ready for intake', () => {
    renderCard(buildDeflection({ subjectStatus: 'READY_FOR_INTAKE' }));

    expect(screen.getByText('Transfer code: 123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Safety check' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Legal release' })).not.toBeInTheDocument();
  });

  it.each(['IN_MEDICAL_INTAKE', 'IN_CHAIR', 'RELEASED'])(
    'shows only Details for %s',
    (status) => {
      renderCard(buildDeflection({ subjectStatus: status }));

      expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Safety check' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Legal release' })).not.toBeInTheDocument();
    }
  );

  it('shows Details for exited', () => {
    renderCard(buildDeflection({ subjectStatus: 'EXITED' }));

    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
  });

  it('navigates to details when Details is clicked', () => {
    renderCard(buildDeflection({ subjectStatus: 'IN_MEDICAL_INTAKE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(mockNavigate).toHaveBeenCalledWith('/custody/123');
    expect(window.sessionStorage.getItem('custodyScrollTarget')).toBe('123');
  });

  it('navigates to legal release when Legal release is clicked', () => {
    renderCard(buildDeflection({ subjectStatus: 'FAILED_INTAKE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Legal release' }));

    expect(mockNavigate).toHaveBeenCalledWith('/custody/123/legal-release');
  });

  it('calls safety check mutation when Passed safety check is clicked', async () => {
    renderCard(buildDeflection({ subjectStatus: 'AWAITING_INTAKE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Safety check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Passed' }));

    await waitFor(() => {
      expect(mockSafetyCheck).toHaveBeenCalledWith(123);
    });

    await waitFor(() => {
      expect(window.sessionStorage.getItem('custodyHighlightTarget')).toBe('123');
    });
  });

  it('opens the exit to jail flow when Failed safety check is clicked', async () => {
    renderCard(buildDeflection({ subjectStatus: 'AWAITING_INTAKE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Safety check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Failed' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockExitToJail).toHaveBeenCalledWith(123);
    });
    await waitFor(() => {
      expect(mockOnExitToJail).toHaveBeenCalledWith();
    });
  });

  it('shows the offline safety check toast for network errors', async () => {
    mockSafetyCheck.mockRejectedValueOnce(new Error('Network Error'));
    renderCard(buildDeflection({ subjectStatus: 'AWAITING_INTAKE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Safety check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Passed' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Safety check not saved. Please try again.', 'error'
      );
    });
  });

  it('shows the error safety check toast for server errors', async () => {
    mockSafetyCheck.mockRejectedValueOnce({ response: { status: 500 } });
    renderCard(buildDeflection({ subjectStatus: 'AWAITING_INTAKE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Safety check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Passed' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Safety check not saved. Please try again.', 'error');
    });
  });
});
