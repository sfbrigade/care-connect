import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminUserSupportPage from './AdminUserSupportPage';

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

const apiMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setPassword: vi.fn(),
  getMfaCode: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    users: {
      get: apiMocks.getUser,
      setPassword: apiMocks.setPassword,
      getMfaCode: apiMocks.getMfaCode,
    },
  },
}));

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: toastMocks.showToast }),
}));

function renderPage () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/users/user-1/support']}>
          <Routes>
            <Route path='/admin/users/:userId/support' element={<AdminUserSupportPage />} />
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
  apiMocks.setPassword.mockResolvedValue({ data: { ok: true } });
  apiMocks.getMfaCode.mockResolvedValue({
    status: 200,
    data: {
      code: '123456',
      expiresAt: '2026-04-30T12:00:00.000Z',
      attemptsRemaining: 4,
      lastSentAt: null,
    },
  });
});

afterEach(() => {
  cleanup();
  for (const mock of Object.values(apiMocks)) {
    mock.mockReset();
  }
  toastMocks.showToast.mockReset();
});

describe('AdminUserSupportPage', () => {
  it('sets a user password through the dedicated endpoint', async () => {
    renderPage();

    await screen.findByText('Password support');
    const submit = screen.getByRole('button', { name: 'Set password' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('New password'), 'Newpassword123!');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'New');
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'x');
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Confirm new password'));
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Mismatch123!');
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(submit).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Confirm new password'));
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Newpassword123!');
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => {
      expect(apiMocks.setPassword).toHaveBeenCalledWith('user-1', 'Newpassword123!');
    });
    expect(toastMocks.showToast).toHaveBeenCalledWith('The user\'s password has been updated', 'success');
  });

  it('shows an active MFA code on screen', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Show active MFA code' }));

    await waitFor(() => {
      expect(apiMocks.getMfaCode).toHaveBeenCalledWith('user-1');
    });
    expect(await screen.findByText('123456')).toBeInTheDocument();
    expect(screen.getByText('Attempts remaining: 4')).toBeInTheDocument();
  });
});
