import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import NotificationSettingsPage from './NotificationSettingsPage';

// jsdom doesn't implement scrollIntoView, which Mantine's Combobox calls on open.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
  it('shows the empty state (no SMS subscription row, no toggles) when there is no verified number', async () => {
    mockUserRef.current = { id: 'user-1', phoneVerifiedAt: null, subscribedEvents: [], notificationsEnabled: false };
    renderPage();

    expect(await screen.findByText('No phone number on file.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add phone number/i })).toBeInTheDocument();
    expect(screen.queryByText('Status')).toBeNull(); // mute row (label 'Status') not shown
    expect(screen.queryByRole('radio')).toBeNull(); // no mute control
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('navigates to the enrollment flow when Add phone number is clicked', async () => {
    mockUserRef.current = { id: 'user-1', phoneVerifiedAt: null, subscribedEvents: [] };
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /add phone number/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/profile/notifications/enroll');
  });

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

  it('when muted, hides the toggles and shows the paused message with Paused selected', async () => {
    mockUserRef.current = {
      id: 'user-1',
      phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
      subscribedEvents: ['NEW_HOLD'],
      notificationsEnabled: false,
    };
    renderPage();

    expect(await screen.findByText(/SMS notifications are paused/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByDisplayValue('Paused')).toBeInTheDocument(); // dropdown shows Paused
  });

  it('muting persists notificationsEnabled:false and hides the toggles', async () => {
    const user = userEvent.setup();
    renderPage(); // beforeEach user is unmuted, toggles visible
    await screen.findByRole('switch', { name: /Person in transit/i });

    await user.click(screen.getByDisplayValue('Active')); // open the dropdown
    await user.click(await screen.findByText('Paused'));

    await waitFor(() => expect(mockUsersUpdate).toHaveBeenCalledWith('user-1', { notificationsEnabled: false }));
    expect(await screen.findByText(/SMS notifications are paused/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('unmuting persists notificationsEnabled:true and reveals the toggles', async () => {
    const user = userEvent.setup();
    mockUserRef.current = {
      id: 'user-1',
      phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
      subscribedEvents: ['NEW_HOLD'],
      notificationsEnabled: false,
    };
    renderPage();
    await screen.findByText(/SMS notifications are paused/i);

    await user.click(screen.getByDisplayValue('Paused')); // open the dropdown
    await user.click(await screen.findByText('Active'));

    await waitFor(() => expect(mockUsersUpdate).toHaveBeenCalledWith('user-1', { notificationsEnabled: true }));
    expect(await screen.findByRole('switch', { name: /Person in transit/i })).toBeInTheDocument();
  });

  it('shows the opt-out banner when the user is carrier-opted-out (STOP)', async () => {
    mockUserRef.current = {
      id: 'user-1',
      roles: ['CUSTODY'],
      phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
      subscribedEvents: ['NEW_HOLD'],
      notificationsEnabled: true,
      smsOptedOutAt: '2026-01-02T00:00:00.000Z',
    };
    renderPage();

    expect(await screen.findByText(/currently blocked from sending text messages/i)).toBeInTheDocument();
  });

  it('does not show the opt-out banner when the user has not opted out', async () => {
    renderPage(); // beforeEach user is not opted out
    await screen.findByRole('switch', { name: /Person in transit/i });

    expect(screen.queryByText('SMS notifications are blocked')).toBeNull();
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
