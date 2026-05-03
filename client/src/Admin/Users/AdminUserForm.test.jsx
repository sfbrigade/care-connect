import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const authMock = vi.hoisted(() => ({
  user: {
    id: 'admin-id',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
  },
}));

vi.mock('@/AuthContext', () => ({
  useAuthContext: () => authMock,
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
  authMock.user = {
    id: 'admin-id',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
  };
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

  it('renders Super Admin, Org Admin, and Facility Admin checkboxes for super-admin editors', async () => {
    renderForm();

    expect(await screen.findByLabelText('Super Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Org Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Facility Admin')).toBeInTheDocument();
  });

  it('reflects existing roles in the new checkboxes', async () => {
    apiMocks.getUser.mockResolvedValue({
      data: {
        id: 'user-1',
        firstName: 'Has',
        lastName: 'Roles',
        email: 'has.roles@test.com',
        isAdmin: false,
        roles: ['CARE', 'FACILITY_ADMIN'],
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
    renderForm();

    const facilityCheckbox = await screen.findByLabelText('Facility Admin');
    await waitFor(() => expect(facilityCheckbox).toBeChecked());
    expect(screen.getByLabelText('Org Admin')).not.toBeChecked();
  });

  it('hides privileged checkboxes for non-super-admin editors', async () => {
    authMock.user = {
      id: 'editor-id',
      firstName: 'Editor',
      lastName: 'User',
      isAdmin: false,
    };
    renderForm();

    await screen.findByLabelText('First name');
    expect(screen.queryByLabelText('Super Admin')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Org Admin')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Facility Admin')).not.toBeInTheDocument();
  });

  it('submits a roles array preserving non-managed roles when toggling Org Admin', async () => {
    apiMocks.getUser.mockResolvedValue({
      data: {
        id: 'user-1',
        firstName: 'Field',
        lastName: 'Officer',
        email: 'field.officer@test.com',
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
    renderForm();

    const orgAdminCheckbox = await screen.findByLabelText('Org Admin');
    await userEvent.click(orgAdminCheckbox);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(apiMocks.updateUser).toHaveBeenCalled());
    const [, payload] = apiMocks.updateUser.mock.calls[0];
    expect(payload.roles).toEqual(expect.arrayContaining(['FIELD', 'ORG_ADMIN']));
    expect(payload.roles).toHaveLength(2);
    expect(payload).not.toHaveProperty('isOrgAdmin');
    expect(payload).not.toHaveProperty('isFacilityAdmin');
  });
});
