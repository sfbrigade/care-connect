import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router';

import ManagedUserDetailsPage from './ManagedUserDetailsPage';

const { mockUsersGet } = vi.hoisted(() => ({
  mockUsersGet: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    users: { get: mockUsersGet },
  },
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function makeQueryClient () {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
    },
  });
}

function renderPage (userId = 'u1') {
  return render(
    <MantineProvider>
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={[`/manage-users/${userId}`]}>
          <Routes>
            <Route path='/manage-users/:userId' element={<ManagedUserDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ManagedUserDetailsPage', () => {
  it('shows Position details, Rank, and Prop 115 for SFSO users', async () => {
    mockUsersGet.mockResolvedValue({
      data: {
        id: 'u1',
        firstName: 'Mary',
        lastName: 'Watson',
        email: 'mary@example.test',
        badgeNumber: '1234',
        organizationId: 'sfso',
        unit: { name: 'Unit A' },
        title: { name: 'Sergeant' },
        prop115Certified: true,
      },
    });
    renderPage('u1');
    await screen.findByText('mary@example.test');
    expect(screen.getByText('Position details')).toBeInTheDocument();
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Prop 115 certification')).toBeInTheDocument();
  });

  it('hides Position details for users not in SFPD or SFSO', async () => {
    mockUsersGet.mockResolvedValue({
      data: {
        id: 'u2',
        firstName: 'Carol',
        lastName: 'Lee',
        email: 'carol@example.test',
        organizationId: null,
      },
    });
    renderPage('u2');
    await screen.findByText('carol@example.test');
    expect(screen.queryByText('Position details')).toBeNull();
  });
});
