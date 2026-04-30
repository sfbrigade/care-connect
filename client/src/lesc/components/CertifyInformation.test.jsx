import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import CertifyInformation from './CertifyInformation';

const { deflectionGetMock, deflectionUpdateMock, showToastMock } = vi.hoisted(() => ({
  deflectionGetMock: vi.fn(),
  deflectionUpdateMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      get: deflectionGetMock,
      update: deflectionUpdateMock,
    },
  },
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({ facility: { id: 'facility-1' } }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('@unhead/react', () => ({
  Head: () => null,
}));

function LocationProbe () {
  const loc = useLocation();
  return <div data-testid='loc'>{loc.pathname}</div>;
}

function renderCertifyInformation () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/holds/10/certify?isNew=true']}>
          <Routes>
            <Route path='/holds/:id/certify' element={<CertifyInformation />} />
            <Route path='*' element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  deflectionGetMock.mockResolvedValue({
    data: {
      id: 10,
      incidentId: 7,
      certifiedAt: null,
    },
  });
  deflectionUpdateMock.mockImplementation((_id, data) => Promise.resolve({
    data: {
      id: 10,
      incidentId: 7,
      certifiedAt: data.certifiedAt,
    },
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CertifyInformation', () => {
  it('saves certification when checked and finishes back to holds', async () => {
    renderCertifyInformation();

    const finishButton = await screen.findByRole('button', { name: 'Finish details' });
    expect(finishButton).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Certify information declaration' }));

    await waitFor(() => {
      expect(deflectionUpdateMock).toHaveBeenCalledWith('10', { certifiedAt: expect.any(String) });
    });
    expect(finishButton).toBeEnabled();

    await userEvent.click(finishButton);

    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/holds');
    });
    expect(showToastMock).toHaveBeenCalledWith('Changes saved.', 'success');
  });
});
