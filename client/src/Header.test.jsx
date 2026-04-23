import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';
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
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

afterEach(() => {
  cleanup();
  mockUserRef.current = null;
});

describe('Header — Change work mode menu item', () => {
  it('does not show the item for single-role FIELD users', async () => {
    renderHeader({ id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD'] });
    const trigger = await screen.findByRole('button');
    trigger.click();
    expect(screen.queryByText('Change work mode')).not.toBeInTheDocument();
  });

  it('does not show the item for single-role CUSTODY users', async () => {
    renderHeader({ id: '1', firstName: 'A', lastName: 'B', roles: ['CUSTODY'] });
    const trigger = await screen.findByRole('button');
    trigger.click();
    expect(screen.queryByText('Change work mode')).not.toBeInTheDocument();
  });

  it('shows the item for dual-role FIELD+CUSTODY users', async () => {
    renderHeader({ id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'] });
    const trigger = await screen.findByRole('button');
    trigger.click();
    expect(await screen.findByText('Change work mode')).toBeInTheDocument();
  });
});

describe('Header — mode label', () => {
  it('shows "In the field" label on /holds for dual-role users', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'], unit: { name: 'K-9 Unit' } },
      '/holds',
    );
    expect(await screen.findByText(/In the field/)).toBeInTheDocument();
    expect(screen.getByText(/K-9 Unit/)).toBeInTheDocument();
  });

  it('shows "At RESET" label on /custody for dual-role users', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'], unit: { name: 'DEM' } },
      '/custody',
    );
    expect(await screen.findByText(/At RESET/)).toBeInTheDocument();
  });

  it('omits mode label for single-role FIELD users', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD'], unit: { name: 'K-9 Unit' } },
      '/holds',
    );
    expect(screen.queryByText(/In the field/)).not.toBeInTheDocument();
  });

  it('omits mode label on mode-agnostic paths (e.g. /profile)', async () => {
    renderHeader(
      { id: '1', firstName: 'A', lastName: 'B', roles: ['FIELD', 'CUSTODY'], unit: { name: 'K-9 Unit' } },
      '/profile',
    );
    expect(screen.queryByText(/In the field/)).not.toBeInTheDocument();
    expect(screen.queryByText(/At RESET/)).not.toBeInTheDocument();
  });
});
