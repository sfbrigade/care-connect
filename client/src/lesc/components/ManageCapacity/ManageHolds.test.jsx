import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import ManageHolds from './ManageHolds';

const {
  mockDeflectionsList,
  mockDeflectionsCancel,
  mockShowToast,
} = vi.hoisted(() => ({
  mockDeflectionsList: vi.fn(),
  mockDeflectionsCancel: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      list: mockDeflectionsList,
      cancel: mockDeflectionsCancel,
    },
  },
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

function renderManageHolds (props = {}) {
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
          <ManageHolds
            facility={{ id: 1, name: 'RESET' }}
            {...props}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeflectionsList.mockResolvedValue({ data: [] });
  mockDeflectionsCancel.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
});

describe('ManageHolds', () => {
  it('requests only active in-transit holds', async () => {
    renderManageHolds();

    await waitFor(() => {
      expect(mockDeflectionsList).toHaveBeenCalledWith({
        facilityId: 1,
        active: 'true',
        subjectStatus: 'DETAINED,ONSITE_AWAITING_TRANSFER',
        perPage: 1000,
      });
    });
  });

  it('renders separate accordions for in-transit and awaiting-custody-transfer holds', async () => {
    mockDeflectionsList.mockResolvedValue({
      data: [
        {
          id: 1,
          status: 'ACTIVE',
          expiresAt: '3026-05-03T12:00:00.000Z',
          subjectStatus: 'DETAINED',
          subject: { firstName: 'Active', lastName: 'Person' },
          createdBy: { firstName: 'Officer', lastName: 'One' },
        },
        {
          id: 2,
          status: 'ACTIVE',
          subjectStatus: 'ONSITE_AWAITING_TRANSFER',
          expiresAt: '3026-05-03T11:00:00.000Z',
          subject: { firstName: 'Onsite', lastName: 'Person' },
          createdBy: { firstName: 'Officer', lastName: 'Two' },
        },
        {
          id: 3,
          status: 'ACTIVE',
          subjectStatus: 'ONSITE_AWAITING_TRANSFER',
          expiresAt: '2026-05-03T09:00:00.000Z',
          subject: { firstName: 'Onsite Doesnt Expire', lastName: 'Person' },
          createdBy: { firstName: 'Officer', lastName: 'Three' },
        },
        {
          id: 4,
          status: 'CANCELLED',
          cancelledAt: '2026-05-03T11:00:00.000Z',
          subjectStatus: 'DETAINED',
          subject: { firstName: 'Cancelled', lastName: 'Person' },
          createdBy: { firstName: 'Officer', lastName: 'Four' },
        },
        {
          id: 5,
          status: 'EXPIRED',
          expiresAt: '2026-05-03T10:00:00.000Z',
          subjectStatus: 'DETAINED',
          subject: { firstName: 'Expired', lastName: 'Person' },
          createdBy: { firstName: 'Officer', lastName: 'Five' },
        },
      ],
    });

    renderManageHolds();

    expect(await screen.findByText('Holds in transit')).toBeInTheDocument();
    expect(screen.getByText('Holds awaiting custody transfer')).toBeInTheDocument();
    expect(await screen.findByText('Active Person')).toBeInTheDocument();
    expect(screen.getByText('Onsite Person')).toBeInTheDocument();
    expect(screen.queryByText('Onsite Doesnt Expire Person')).toBeInTheDocument();
    expect(screen.queryByText('Cancelled Person')).not.toBeInTheDocument();
    expect(screen.queryByText('Expired Person')).not.toBeInTheDocument();
  });
});
