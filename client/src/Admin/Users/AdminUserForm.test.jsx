import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminUserForm from './AdminUserForm';

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

const apiMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  getOrganizations: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    users: {
      get: apiMocks.getUser,
      update: apiMocks.updateUser,
    },
    organizations: {
      index: apiMocks.getOrganizations,
      titles: { index: vi.fn() },
      units: { index: vi.fn() },
    },
  },
}));

vi.mock('@/AuthContext', () => ({
  useAuthContext: () => ({
    user: {
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
    },
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

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
        <MemoryRouter initialEntries={['/admin/users/user-1']}>
          <Routes>
            <Route path='/admin/users/:userId' element={<AdminUserForm />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  apiMocks.getUser.mockResolvedValue({
    data: {
      id: 'user-1',
      firstName: 'Regular',
      lastName: 'User',
      email: 'regular.user@test.com',
      isAdmin: false,
      roles: ['FIELD'],
      picture: null,
      pictureUrl: null,
      organizationId: null,
      organization: null,
      badgeNumber: null,
      titleId: null,
      title: null,
      unitId: null,
      unit: null,
      prop115Certified: false,
      deactivatedAt: null,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  });
  apiMocks.getOrganizations.mockResolvedValue({
    data: [
      { id: 'sfpd', name: 'SFPD' },
      { id: 'sfso', name: 'SFSO' },
    ],
  });
  apiMocks.updateUser.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  for (const mock of Object.values(apiMocks)) {
    mock.mockReset();
  }
});

describe('AdminUserForm', () => {
  it('does not render password or MFA support actions', async () => {
    renderForm();

    expect(await screen.findByText('Edit Profile')).toBeInTheDocument();
    expect(screen.queryByText('Password support')).not.toBeInTheDocument();
    expect(screen.queryByText('MFA support')).not.toBeInTheDocument();
  });

  it('enables admin editing for identity fields', async () => {
    renderForm();

    await waitFor(() => expect(screen.getByLabelText('First name')).toBeEnabled());
    expect(screen.getByLabelText('Last name')).toBeEnabled();
    expect(screen.getByLabelText('Email')).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Organization' })).toBeEnabled();
  });
});
