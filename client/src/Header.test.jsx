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
          <Header />
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
