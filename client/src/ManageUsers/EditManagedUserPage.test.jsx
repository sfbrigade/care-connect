import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import EditManagedUserPage from './EditManagedUserPage';

const {
  mockUsersGet,
  mockUsersUpdate,
  mockUnitsIndex,
  mockTitlesIndex,
  mockShowToast,
} = vi.hoisted(() => ({
  mockUsersGet: vi.fn(),
  mockUsersUpdate: vi.fn(),
  mockUnitsIndex: vi.fn(),
  mockTitlesIndex: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    users: { get: mockUsersGet, update: mockUsersUpdate },
    organizations: {
      units: { index: mockUnitsIndex },
      titles: { index: mockTitlesIndex },
    },
  },
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function LocationProbe () {
  const loc = useLocation();
  return <div data-testid='loc'>{loc.pathname}</div>;
}

function makeQueryClient () {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderEditPage (userId, section) {
  return render(
    <MantineProvider>
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={[`/manage-users/${userId}/edit/${section}`]}>
          <Routes>
            <Route path='/manage-users/:userId/edit/:section' element={<EditManagedUserPage />} />
            <Route path='*' element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUnitsIndex.mockResolvedValue({ data: [] });
  mockTitlesIndex.mockResolvedValue({ data: [] });
});

afterEach(() => {
  cleanup();
});

describe('EditManagedUserPage', () => {
  it('splits a multi-word fullName into firstName and lastName on save', async () => {
    mockUsersGet.mockResolvedValue({
      data: {
        id: 'u1',
        firstName: 'Mary',
        lastName: 'Jane Watson',
        email: 'mary@example.test',
        organizationId: 'sfpd',
      },
    });
    mockUsersUpdate.mockImplementation((id, payload) => Promise.resolve({
      data: { id, ...payload },
    }));
    renderEditPage('u1', 'personal');

    // Form populates from loaded user; multi-word last name renders as one combined value.
    await screen.findByDisplayValue('Mary Jane Watson');

    // Edit email so the form is dirty without changing the name.
    const emailInput = screen.getByDisplayValue('mary@example.test');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'mary.watson@example.test');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockUsersUpdate).toHaveBeenCalledWith('u1', {
        firstName: 'Mary',
        lastName: 'Jane Watson',
        email: 'mary.watson@example.test',
      });
    });
  });

  it('redirects out of /edit/position for users not in SFPD or SFSO', async () => {
    mockUsersGet.mockResolvedValue({
      data: {
        id: 'u2',
        firstName: 'Carol',
        lastName: 'Lee',
        email: 'carol@example.test',
        organizationId: null,
      },
    });
    renderEditPage('u2', 'position');

    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/manage-users/u2');
    });
  });
});
