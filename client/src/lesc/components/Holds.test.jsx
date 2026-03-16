import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { DateTime } from 'luxon';

import Holds from './Holds';

const { mockNavigate, mockShowToast, mockIncidentsCreate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockIncidentsCreate: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key === 'bedType.CHAIR' ? 'Chair' : key,
  }),
}));

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
    },
  },
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: {
      id: 'facility-1',
      bedTypes: [{ id: 'bed-1', type: 'CHAIR', available: 1 }],
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

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mockIncidentsCreate.mockResolvedValue({
    data: { id: 14, facilityId: 'facility-1' },
  });
});

afterEach(() => {
  cleanup();
});

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
        <Holds />
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

    const [payload, options] = mockIncidentsCreate.mock.calls[0];
    expect(payload.facilityId).toBe('facility-1');
    expect(payload.arrestedAt).toBeTruthy();
    expect(DateTime.fromISO(payload.arrestedAt).isValid).toBe(true);
    expect(options).toEqual({ bedTypeId: 'bed-1' });
  });
});
