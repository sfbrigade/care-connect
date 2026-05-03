import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import Custody from './Custody';

const {
  mockBedTypesIndex,
  mockDeflectionsList,
  mockSessionStateValue,
  mockSetSessionState,
  mockShowToast,
} = vi.hoisted(() => ({
  mockBedTypesIndex: vi.fn(),
  mockDeflectionsList: vi.fn(),
  mockSessionStateValue: { current: 'in-custody' },
  mockSetSessionState: vi.fn(),
  mockShowToast: vi.fn(),
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

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: {
      id: 6,
      status: 'OPEN',
      bedTypes: [{ id: 1, available: 3, inTransit: 2, occupied: 2, type: 'CHAIR' }],
    },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/hooks/useSessionState', () => ({
  default: () => [mockSessionStateValue.current, mockSetSessionState],
}));

vi.mock('./ScanTransferCodeModal', async () => {
  const React = await import('react');
  return {
    default: ({ onClose, onSuccess }) => React.createElement(
      'div',
      { role: 'dialog', 'aria-label': 'Scan transfer code' },
      React.createElement('button', { type: 'button', onClick: onSuccess }, 'scan success'),
      React.createElement('button', { type: 'button', onClick: onClose }, 'cancel scan')
    ),
  };
});

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function renderCustody () {
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
          <Custody />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSessionStateValue.current = 'in-custody';

  mockBedTypesIndex.mockResolvedValue({
    data: [{ id: 1, available: 17, inTransit: 2, occupied: 2, type: 'CHAIR' }],
  });

  mockDeflectionsList.mockImplementation(({ subjectStatus }) => {
    if (subjectStatus === 'AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,IN_MEDICAL_INTAKE,IN_CHAIR') {
      return Promise.resolve({
        data: [
          { id: 1, subjectStatus: 'AWAITING_INTAKE' },
          { id: 2, subjectStatus: 'READY_FOR_INTAKE' },
          { id: 3, subjectStatus: 'IN_CHAIR' },
        ],
      });
    }

    if (subjectStatus === 'DETAINED,ONSITE_AWAITING_TRANSFER') {
      return Promise.resolve({
        data: [
          { id: 4, subjectStatus: 'DETAINED' },
          { id: 5, subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
        ],
      });
    }

    if (subjectStatus === 'RELEASED,EXITED') {
      return Promise.resolve({
        data: [
          { id: 6, subjectStatus: 'RELEASED' },
          { id: 7, subjectStatus: 'EXITED' },
        ],
      });
    }

    return Promise.resolve({ data: [] });
  });
});

afterEach(() => {
  cleanup();
});

describe('Custody', () => {
  it('shows the SFSO chair availability summary counts', async () => {
    renderCustody();

    expect(await screen.findByText('17 chairs available')).toBeInTheDocument();
    expect(screen.getByText('2 in transit')).toBeInTheDocument();
    expect(screen.getByText('2 occupied')).toBeInTheDocument();
  });

  it('shows the Take custody button on the Legally released tab', async () => {
    mockSessionStateValue.current = 'released';

    renderCustody();

    expect(await screen.findByRole('button', { name: /take custody/i })).toBeInTheDocument();
  });

  it('switches to In custody when transfer scan succeeds from the Legally released tab', async () => {
    mockSessionStateValue.current = 'released';

    renderCustody();

    fireEvent.click(await screen.findByRole('button', { name: /take custody/i }));
    fireEvent.click(screen.getByRole('button', { name: /scan success/i }));

    expect(mockSetSessionState).toHaveBeenCalledWith('in-custody');
  });

  it('leaves the user on the Legally released tab when transfer scan is canceled', async () => {
    mockSessionStateValue.current = 'released';

    renderCustody();

    fireEvent.click(await screen.findByRole('button', { name: /take custody/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel scan/i }));

    expect(mockSetSessionState).not.toHaveBeenCalled();
  });

  it('groups jail exits under the Transferred to jail section on the released tab', async () => {
    mockSessionStateValue.current = 'released';
    mockDeflectionsList.mockImplementation(({ subjectStatus }) => {
      if (subjectStatus === 'AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,IN_MEDICAL_INTAKE,IN_CHAIR') {
        return Promise.resolve({ data: [] });
      }

      if (subjectStatus === 'RELEASED,EXITED') {
        return Promise.resolve({
          data: [
            { id: 6, subjectStatus: 'RELEASED' },
            { id: 7, subjectStatus: 'EXITED', exitDestination: 'jail', releasedAt: '2026-01-01T00:00:00.000Z' },
          ],
        });
      }

      return Promise.resolve({ data: [] });
    });

    renderCustody();

    expect(await screen.findByText('Transferred to jail: 1')).toBeInTheDocument();
    expect(screen.getByText('Exited facility: 0')).toBeInTheDocument();
  });
});
