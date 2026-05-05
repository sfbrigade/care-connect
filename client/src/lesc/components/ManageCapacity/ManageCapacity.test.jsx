import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import ManageCapacity from './ManageCapacity';

const {
  mockFacilityGet,
  mockBedTypesIndex,
  mockDeflectionsList,
} = vi.hoisted(() => ({
  mockFacilityGet: vi.fn(),
  mockBedTypesIndex: vi.fn(),
  mockDeflectionsList: vi.fn(),
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

vi.mock('@/Api', () => ({
  default: {
    facilities: {
      get: mockFacilityGet,
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
      id: 1,
      name: 'RESET',
      status: 'OPEN_ACCEPTING',
      bedTypes: [{ id: 99, available: 16, capacity: 25, holds: 6, inTransit: 2, occupied: 2, unavailableUnoccupied: 0, type: 'CHAIR' }],
    },
  }),
}));

function renderManageCapacity () {
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
          <ManageCapacity />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

function hasExactTextContent (text) {
  return (_, node) => node?.textContent === text;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFacilityGet.mockResolvedValue({
    data: {
      id: 1,
      name: 'RESET',
      status: 'OPEN_ACCEPTING',
    },
  });
  mockBedTypesIndex.mockResolvedValue({
    data: [{
      id: 99,
      available: 16,
      capacity: 25,
      holds: 6,
      inTransit: 2,
      occupied: 2,
      unavailableUnoccupied: 0,
      type: 'CHAIR',
    }],
  });
  mockDeflectionsList.mockResolvedValue({
    data: [
      { id: 5, status: 'ACTIVE', subjectStatus: 'ONSITE_AWAITING_TRANSFER', expiresAt: '3026-05-03T12:00:00.000Z' },
      { id: 6, status: 'ACTIVE', subjectStatus: 'ONSITE_AWAITING_TRANSFER', expiresAt: '3026-05-03T12:00:00.000Z' },
      { id: 7, status: 'ACTIVE', subjectStatus: 'ONSITE_AWAITING_TRANSFER', expiresAt: '2020-05-03T12:00:00.000Z' },
    ],
  });
});

afterEach(() => {
  cleanup();
});

describe('ManageCapacity', () => {
  it('shows awaiting-custody-transfer count and excludes it from held-in-custody-on-site', async () => {
    renderManageCapacity();

    expect(await screen.findByText(/Held \(in transit\) –/)).toBeInTheDocument();
    expect(screen.getByText(hasExactTextContent('Held (in transit) – 2'))).toBeInTheDocument();
    expect(screen.getByText(hasExactTextContent('Held (awaiting custody transfer) – 3'))).toBeInTheDocument();
    expect(screen.getByText(hasExactTextContent('Held (in custody on site) – 1'))).toBeInTheDocument();

    await waitFor(() => {
      expect(mockDeflectionsList).toHaveBeenCalledWith({
        facilityId: 1,
        active: 'true',
        subjectStatus: 'ONSITE_AWAITING_TRANSFER',
        perPage: 1000,
      });
    });
  });
});
