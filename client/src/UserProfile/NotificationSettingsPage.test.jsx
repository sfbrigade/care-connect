import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import NotificationSettingsPage from './NotificationSettingsPage';

const { mockUsersUpdate, mockShowToast, mockNavigate, mockUserRef } = vi.hoisted(() => ({
  mockUsersUpdate: vi.fn(),
  mockShowToast: vi.fn(),
  mockNavigate: vi.fn(),
  mockUserRef: { current: null },
}));

vi.mock('@/Api', () => ({
  default: { users: { update: mockUsersUpdate } },
}));

vi.mock('@/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUserRef.current }),
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({ facility: { name: 'RESET' } }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

function renderPage () {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(['users', 'me'], mockUserRef.current);
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotificationSettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRef.current = {
    id: 'user-1',
    phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
    subscribedEvents: ['NEW_HOLD'],
    notificationsEnabled: true,
  };
  mockUsersUpdate.mockResolvedValue({ data: {} });
});

afterEach(cleanup);

describe('NotificationSettingsPage (auto-apply)', () => {
  it('shows no Save or Cancel buttons — changes apply automatically', async () => {
    renderPage();
    await screen.findByRole('switch', { name: /Person in transit/i });

    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('persists the full subscribedEvents set immediately on toggle, without navigating', async () => {
    renderPage();
    const arrival = await screen.findByRole('switch', { name: /Person has arrived/i });

    fireEvent.click(arrival);

    await waitFor(() => expect(mockUsersUpdate).toHaveBeenCalledTimes(1));
    expect(mockUsersUpdate.mock.calls[0][0]).toBe('user-1');
    const sent = mockUsersUpdate.mock.calls[0][1].subscribedEvents;
    expect(new Set(sent)).toEqual(new Set(['NEW_HOLD', 'ARRIVAL']));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reverts the toggle and shows an error toast when the save fails', async () => {
    mockUsersUpdate.mockRejectedValueOnce(new Error('nope'));
    renderPage();
    const arrival = await screen.findByRole('switch', { name: /Person has arrived/i });
    expect(arrival).not.toBeChecked();

    fireEvent.click(arrival);
    expect(arrival).toBeChecked(); // optimistic

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Couldn’t save your preferences', 'error', 4000, 'Please try again.')
    );
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /Person has arrived/i })).not.toBeChecked()
    );
  });

  it('coalesces rapid toggles into a single trailing save carrying the final set', async () => {
    let resolveFirst;
    mockUsersUpdate
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = () => resolve({ data: {} }); }))
      .mockResolvedValue({ data: {} });
    renderPage();
    const arrival = await screen.findByRole('switch', { name: /Person has arrived/i });
    const exit = await screen.findByRole('switch', { name: /Person has exited/i });

    fireEvent.click(arrival); // first save — left in flight
    fireEvent.click(exit); // queued as the trailing save
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);

    resolveFirst();

    await waitFor(() => expect(mockUsersUpdate).toHaveBeenCalledTimes(2));
    const trailing = mockUsersUpdate.mock.calls[1][1].subscribedEvents;
    expect(new Set(trailing)).toEqual(new Set(['NEW_HOLD', 'ARRIVAL', 'EXIT']));
  });
});
