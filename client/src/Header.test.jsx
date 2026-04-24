import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import Header from './Header';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const { mockUserRef } = vi.hoisted(() => ({
  mockUserRef: { current: null },
}));

vi.mock('./AuthContext', () => ({
  useAuthContext: () => ({ user: mockUserRef.current, setUser: vi.fn() }),
}));

vi.mock('./FacilityContext', () => ({
  useFacilityContext: () => ({ facility: null, setFacility: vi.fn() }),
}));

const { meMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
}));

vi.mock('./Api', () => ({
  default: {
    users: { me: meMock },
  },
}));

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: toastMocks.showToast }),
}));

function LocationProbe () {
  const loc = useLocation();
  return <div data-testid='loc'>{loc.pathname}</div>;
}

function renderHeader (user, pathname = '/') {
  mockUserRef.current = user;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[pathname]}>
          <Header opened={false} close={() => {}} toggle={() => {}} logout={() => {}} />
          <Routes>
            <Route path='*' element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  meMock.mockResolvedValue({ status: 200, data: { hasActiveFieldWork: false } });
});

afterEach(() => {
  cleanup();
  mockUserRef.current = null;
  toastMocks.showToast.mockClear();
  meMock.mockReset();
  globalThis.sessionStorage.clear();
});

describe('Header — Work mode submenu', () => {
  it('does not show submenu for single-role FIELD users', async () => {
    renderHeader({ id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD'] });
    const trigger = await screen.findByRole('button');
    await userEvent.click(trigger);
    expect(screen.queryByText('Work mode')).not.toBeInTheDocument();
  });

  it('shows submenu with current-mode checkmark on /holds for dual-role', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] },
      '/holds'
    );
    const trigger = await screen.findByRole('button');
    await userEvent.click(trigger);
    expect(await screen.findByText('Work mode')).toBeInTheDocument();
    const fieldItem = screen.getByLabelText('Work mode: In the field');
    expect(fieldItem).toHaveAttribute('aria-current', 'true');
    const resetItem = screen.getByLabelText('Work mode: At RESET');
    expect(resetItem).not.toHaveAttribute('aria-current');
  });

  it('navigates to other home + toast on click when not blocked', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] },
      '/holds'
    );
    const trigger = await screen.findByRole('button');
    await userEvent.click(trigger);
    const resetItem = await screen.findByLabelText('Work mode: At RESET');
    await userEvent.click(resetItem);

    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/custody');
    });
    expect(toastMocks.showToast).toHaveBeenCalledWith(
      'Mode changed to "At RESET"',
      'success',
      4000,
      expect.any(String)
    );
  });

  it('blocks CUSTODY click when hasActiveFieldWork and shows error toast', async () => {
    meMock.mockResolvedValue({ status: 200, data: { hasActiveFieldWork: true } });
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] },
      '/holds'
    );
    const trigger = await screen.findByRole('button');
    await userEvent.click(trigger);

    const resetItem = await screen.findByLabelText('Work mode: At RESET');
    await waitFor(() => expect(resetItem).toHaveAttribute('aria-disabled', 'true'));
    await userEvent.click(resetItem);

    expect(screen.getByTestId('loc')).toHaveTextContent('/holds');
    expect(toastMocks.showToast).toHaveBeenCalledWith(
      "Couldn't update work mode",
      'error',
      5000,
      expect.stringContaining('active field work')
    );
  });

  it('falls back to stored mode on a neutral route', async () => {
    globalThis.sessionStorage.setItem('cc:workMode', 'CUSTODY');
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] },
      '/manage-users'
    );
    const trigger = await screen.findByRole('button');
    await userEvent.click(trigger);
    const resetItem = await screen.findByLabelText('Work mode: At RESET');
    expect(resetItem).toHaveAttribute('aria-current', 'true');
  });

  it('persists route mode to globalThis.sessionStorage so neutral routes show it', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] },
      '/holds'
    );
    await waitFor(() => expect(globalThis.sessionStorage.getItem('cc:workMode')).toBe('FIELD'));
  });

  it('clicking current mode is a no-op (no navigation, no toast)', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] },
      '/holds'
    );
    const trigger = await screen.findByRole('button');
    await userEvent.click(trigger);
    const fieldItem = await screen.findByLabelText('Work mode: In the field');
    await userEvent.click(fieldItem);

    expect(screen.getByTestId('loc')).toHaveTextContent('/holds');
    expect(toastMocks.showToast).not.toHaveBeenCalled();
  });
});

describe('Header — mode label', () => {
  it('shows "In the field" label on /holds for dual-role users', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'], unit: { name: 'K-9 Unit' } },
      '/holds'
    );
    expect(await screen.findByText(/In the field/)).toBeInTheDocument();
    expect(screen.getByText(/K-9 Unit/)).toBeInTheDocument();
  });

  it('shows "At RESET" label on /custody for dual-role users', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'], unit: { name: 'DEM' } },
      '/custody'
    );
    expect(await screen.findByText(/At RESET/)).toBeInTheDocument();
  });

  it('omits mode label for single-role FIELD users', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD'], unit: { name: 'K-9 Unit' } },
      '/holds'
    );
    expect(screen.queryByText(/In the field/)).not.toBeInTheDocument();
  });

  it('omits mode label on mode-agnostic paths (e.g. /profile)', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'], unit: { name: 'K-9 Unit' } },
      '/profile'
    );
    expect(screen.queryByText(/In the field/)).not.toBeInTheDocument();
    expect(screen.queryByText(/At RESET/)).not.toBeInTheDocument();
  });
});
