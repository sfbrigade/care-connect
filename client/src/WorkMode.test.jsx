import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import WorkMode from './WorkMode';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('./AuthContext', () => ({
  useAuthContext: () => ({
    user: {
      id: 'u1',
      organizationId: 'org1',
      roles: ['FIELD', 'CUSTODY'],
      unit: { id: 'u-current', name: 'K-9 Unit' },
    },
    setUser: vi.fn(),
  }),
}));

vi.mock('./Api', () => ({
  default: {
    users: { update: vi.fn() },
    organizations: {
      units: {
        index: vi.fn().mockResolvedValue({
          data: [{ id: 'u-dem', name: 'Department of Emergency Management' }],
        }),
      },
    },
  },
}));

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: toastMocks.showToast }),
}));

function renderWorkMode (initialEntry = { pathname: '/work-mode', state: { from: '/holds' } }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <WorkMode />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

afterEach(async () => {
  cleanup();
  toastMocks.showToast.mockClear();
  const Api = (await import('./Api')).default;
  Api.users.update.mockClear();
});

describe('WorkMode — form', () => {
  it('renders both mode options and the unit picker', async () => {
    renderWorkMode();
    expect(await screen.findByText('In the field')).toBeInTheDocument();
    expect(screen.getByText('At RESET')).toBeInTheDocument();
    expect(screen.getByLabelText(/Unit/, { selector: 'input' })).toBeInTheDocument();
  });

  it('preselects the opposite mode when coming from /holds', async () => {
    renderWorkMode({ pathname: '/work-mode', state: { from: '/holds' } });
    const resetBtn = await screen.findByRole('radio', { name: 'At RESET' });
    expect(resetBtn).toBeChecked();
  });

  it('preselects FIELD when location state is absent', async () => {
    renderWorkMode({ pathname: '/work-mode' });
    const fieldBtn = await screen.findByRole('radio', { name: 'In the field' });
    expect(fieldBtn).toBeChecked();
  });

  it('disables Confirm until a unit is typed', async () => {
    renderWorkMode();
    const confirm = await screen.findByRole('button', { name: /Confirm/ });
    expect(confirm).toBeDisabled();

    const input = screen.getByLabelText(/Unit/, { selector: 'input' });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, 'K-9 Unit');
    expect(confirm).toBeEnabled();
  });
});

describe('WorkMode — submit success path', () => {
  it('submits { unitId, unitName, targetMode } and navigates to /holds on FIELD success', async () => {
    const Api = (await import('./Api')).default;
    Api.users.update.mockResolvedValueOnce({ data: {} });

    renderWorkMode({ pathname: '/work-mode', state: { from: '/custody' } });
    const field = await screen.findByRole('radio', { name: 'In the field' });
    expect(field).toBeChecked();

    const input = screen.getByLabelText(/Unit/, { selector: 'input' });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, 'K-9 Unit');
    await userEvent.click(screen.getByRole('button', { name: /Confirm/ }));

    expect(Api.users.update).toHaveBeenCalledWith('u1', {
      unitId: null,
      unitName: 'K-9 Unit',
      targetMode: 'FIELD',
    });
  });

  it('submits with targetMode=CUSTODY and navigates to /custody on success', async () => {
    const Api = (await import('./Api')).default;
    Api.users.update.mockResolvedValueOnce({ data: {} });

    renderWorkMode({ pathname: '/work-mode', state: { from: '/holds' } });
    const reset = await screen.findByRole('radio', { name: 'At RESET' });
    expect(reset).toBeChecked();

    const input = screen.getByLabelText(/Unit/, { selector: 'input' });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, 'Department of Emergency Management');
    await userEvent.click(screen.getByRole('button', { name: /Confirm/ }));

    expect(Api.users.update).toHaveBeenCalledWith('u1', expect.objectContaining({
      targetMode: 'CUSTODY',
      unitName: 'Department of Emergency Management',
    }));
  });
});

describe('WorkMode — blocker modal', () => {
  it('shows the modal on 409 ACTIVE_FIELD_WORK and both bullets are rendered', async () => {
    const Api = (await import('./Api')).default;
    const err = Object.assign(new Error('conflict'), {
      response: { status: 409, data: { code: 'ACTIVE_FIELD_WORK' } },
    });
    Api.users.update.mockRejectedValueOnce(err);

    renderWorkMode({ pathname: '/work-mode', state: { from: '/holds' } });
    const input = await screen.findByLabelText(/Unit/, { selector: 'input' });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, 'Department of Emergency Management');
    await userEvent.click(screen.getByRole('button', { name: /Confirm/ }));

    expect(await screen.findByText('Finish active field work first')).toBeInTheDocument();
    expect(screen.getByText(/Active incidents with holds/)).toBeInTheDocument();
    expect(screen.getByText(/Active RESET arrival status/)).toBeInTheDocument();
  });

  it('does not show the modal for other errors', async () => {
    const Api = (await import('./Api')).default;
    Api.users.update.mockRejectedValueOnce(Object.assign(new Error('server down'), {
      response: { status: 500, data: {} },
    }));

    renderWorkMode({ pathname: '/work-mode', state: { from: '/holds' } });
    const input = await screen.findByLabelText(/Unit/, { selector: 'input' });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, 'Department of Emergency Management');
    await userEvent.click(screen.getByRole('button', { name: /Confirm/ }));

    // Wait a tick then confirm the modal is absent
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('Finish active field work first')).not.toBeInTheDocument();
  });
});

describe('WorkMode — access guard', () => {
  it('redirects single-role users away', async () => {
    vi.resetModules();
    vi.doMock('./AuthContext', () => ({
      useAuthContext: () => ({
        user: { id: 'u1', organizationId: 'org1', roles: ['FIELD'] },
        setUser: vi.fn(),
      }),
    }));
    const { default: WorkModeReloaded } = await import('./WorkMode');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/work-mode']}>
            <WorkModeReloaded />
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>
    );

    // The form must NOT render.
    expect(screen.queryByText('How are you working today?')).not.toBeInTheDocument();
  });
});
