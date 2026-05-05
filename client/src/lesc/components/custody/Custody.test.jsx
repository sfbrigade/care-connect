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

  mockDeflectionsList.mockImplementation(({ subjectStatus, status }) => {
    if (subjectStatus === 'AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,IN_MEDICAL_INTAKE,IN_CHAIR') {
      return Promise.resolve({
        data: [
          { id: 1, subjectStatus: 'AWAITING_INTAKE' },
          { id: 2, subjectStatus: 'READY_FOR_INTAKE' },
          { id: 3, subjectStatus: 'IN_CHAIR' },
        ],
      });
    }

    if (subjectStatus === 'DETAINED,ONSITE_AWAITING_TRANSFER' && status === 'ACTIVE') {
      return Promise.resolve({
        data: [
          {
            id: 4,
            subjectStatus: 'DETAINED',
            expiresAt: '2026-05-05T19:00:00.000Z',
            narcoticsSubstance: false,
            narcoticsParaphernalia: false,
            drugUseEvidence: false,
            drugType: null,
            behavior: 'Cooperative',
            behaviorNarrative: 'Cooperative during transfer.',
            chargeType: 'RWS_647F',
            property: 'NONE',
            certifiedAt: '2026-05-05T18:00:00.000Z',
            currentOfficer: { id: 'officer-1', firstName: 'Officer', lastName: 'One', badgeNumber: '1234' },
            subject: {
              firstName: 'Complete',
              lastName: 'Person',
              dateOfBirth: '1990-01-01T00:00:00.000Z',
              sex: 'MALE',
              race: 'UNKNOWN',
            },
            incident: {
              addressLine1: '1 Main St',
              city: 'San Francisco',
              state: 'CA',
              arrestedAt: '2026-05-05T18:00:00.000Z',
              encounteredVia: 'ON_VIEW',
              cadNumber: 'CAD123',
              caseNumber: 'CASE123',
              supervisorBadgeNumber: '777',
            },
          },
          {
            id: 5,
            subjectStatus: 'ONSITE_AWAITING_TRANSFER',
            currentOfficer: { id: 'officer-2', firstName: 'Officer', lastName: 'Two', badgeNumber: '5678' },
            subject: { firstName: 'Incomplete', lastName: 'Person' },
            incident: {},
          },
          {
            id: 8,
            subjectStatus: 'ONSITE_AWAITING_TRANSFER',
            // expiresAt deliberately in the past — server #861 keeps these ACTIVE indefinitely once arrived.
            expiresAt: '2024-01-01T00:00:00.000Z',
            arrivedAt: '2026-05-05T18:30:00.000Z',
            narcoticsSubstance: false,
            narcoticsParaphernalia: false,
            drugUseEvidence: false,
            drugType: null,
            behavior: 'Cooperative',
            behaviorNarrative: 'Cooperative during transfer.',
            chargeType: 'RWS_647F',
            property: 'NONE',
            certifiedAt: '2026-05-05T18:00:00.000Z',
            currentOfficer: { id: 'officer-3', firstName: 'Officer', lastName: 'Three', badgeNumber: '9999' },
            subject: {
              firstName: 'Onsite',
              lastName: 'Person',
              dateOfBirth: '1990-01-01T00:00:00.000Z',
              sex: 'MALE',
              race: 'UNKNOWN',
            },
            incident: {
              addressLine1: '2 Main St',
              city: 'San Francisco',
              state: 'CA',
              arrestedAt: '2026-05-05T18:00:00.000Z',
              encounteredVia: 'ON_VIEW',
              cadNumber: 'CAD124',
              caseNumber: 'CASE124',
              supervisorBadgeNumber: '888',
            },
          },
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

  it('shows the Take custody button on the Released tab', async () => {
    mockSessionStateValue.current = 'released';

    renderCustody();

    expect(await screen.findByRole('button', { name: /take custody/i })).toBeInTheDocument();
  });

  it('switches to Custody when transfer scan succeeds from the Released tab', async () => {
    mockSessionStateValue.current = 'released';

    renderCustody();

    fireEvent.click(await screen.findByRole('button', { name: /take custody/i }));
    fireEvent.click(screen.getByRole('button', { name: /scan success/i }));

    expect(mockSetSessionState).toHaveBeenCalledWith('custody');
  });

  it('leaves the user on the Released tab when transfer scan is canceled', async () => {
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
            { id: 7, subjectStatus: 'EXITED', exitDestination: 'JAIL', releasedAt: '2026-01-01T00:00:00.000Z' },
          ],
        });
      }

      return Promise.resolve({ data: [] });
    });

    renderCustody();

    expect(await screen.findByText('Transferred to jail: 1')).toBeInTheDocument();
    expect(screen.getByText('Exited facility: 0')).toBeInTheDocument();
  });


  it('shows transit persons grouped by owning officer', async () => {
    mockSessionStateValue.current = 'transit';

    renderCustody();

    expect(await screen.findByText('O. One #1234')).toBeInTheDocument();
    expect(screen.getByText('Complete Person')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /details/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('O. Two #5678')).toBeInTheDocument();
    expect(screen.getByText('Incomplete Person')).toBeInTheDocument();
    expect(screen.getByText('Details incomplete')).toBeInTheDocument();
    expect(screen.getByText('O. Three #9999')).toBeInTheDocument();
    expect(screen.getByText('Onsite Person')).toBeInTheDocument();
  });

  it('shows an Arrived inline label on ONSITE_AWAITING_TRANSFER holds in place of the expiry countdown', async () => {
    mockSessionStateValue.current = 'transit';

    renderCustody();

    await screen.findByText('Onsite Person');
    // Hold 8 has arrivedAt → "Arrived at HH:MM"; Hold 5 has no arrivedAt → plain "Arrived" (defensive fallback).
    // Implementation gates the inline label and the expiry Title as mutually-exclusive,
    // so label presence implies timer suppression on those cards.
    expect(screen.getByText(/^Arrived at \d{1,2}:\d{2} (AM|PM)$/)).toBeInTheDocument();
    expect(screen.getByText('Arrived')).toBeInTheDocument();
  });

  it('orders officer groups with arrived holds before officer groups with only detained holds', async () => {
    mockSessionStateValue.current = 'transit';

    renderCustody();

    await screen.findByText('O. One #1234');
    // Server returns holds in order [4 DETAINED → officer-1, 5 ONSITE_AWAITING_TRANSFER → officer-2,
    // 8 ONSITE_AWAITING_TRANSFER → officer-3]. Without the sort, DOM order would be One, Two, Three.
    // After sorting groups with arrived holds to the top, expect Two and Three before One,
    // with stable ordering preserving Two before Three.
    const officerHeaders = screen.getAllByText(/^O\. /);
    expect(officerHeaders.map(el => el.textContent)).toEqual([
      'O. Two #5678',
      'O. Three #9999',
      'O. One #1234',
    ]);
  });

  it('requests only active pre-transfer holds for Transit', async () => {
    mockSessionStateValue.current = 'transit';

    renderCustody();

    await screen.findByText('O. One #1234');
    expect(mockDeflectionsList).toHaveBeenCalledWith(expect.objectContaining({
      subjectStatus: 'DETAINED,ONSITE_AWAITING_TRANSFER',
      status: 'ACTIVE',
      includeCurrentOfficer: true,
    }));
  });
});
