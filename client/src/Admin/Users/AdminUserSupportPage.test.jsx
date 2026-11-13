import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  getSmsState: vi.fn(),
  overrideSmsOptOut: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    users: {
      get: apiMocks.getUser,
      setPassword: apiMocks.setPassword,
      getMfaCode: apiMocks.getMfaCode,
      getSmsState: apiMocks.getSmsState,
      overrideSmsOptOut: apiMocks.overrideSmsOptOut,
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
  apiMocks.getSmsState.mockResolvedValue({
    status: 200,
    data: {
      state: {
        phoneNumber: '+14155550100',
        phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
        smsConsentAt: '2026-01-01T00:00:00.000Z',
        smsOptedOutAt: null,
        notificationsEnabled: true,
        subscribedEvents: ['NEW_HOLD'],
        currentFacilityId: 'fac-1',
        currentFacilityName: 'RESET',
        smsWelcomedAt: null,
        roles: ['CUSTODY'],
        deactivatedAt: null,
        deletedAt: null,
      },
      otp: { lastSentAt: null, attempts: 0, expiresAt: null },
      gate: {
        global: globalChecks(),
        events: [
          { event: 'NEW_HOLD', passed: true, checks: eventChecks({ subscribed: true }) },
          { event: 'ARRIVAL', passed: false, checks: eventChecks({ subscribed: false }) },
        ],
      },
      awsOptOut: { available: true, optedOut: false },
      optHistory: { events: [], nextAllowedAfter: null },
    },
  });
  apiMocks.overrideSmsOptOut.mockResolvedValue({ data: { outcome: 'restored', awsReason: null } });
});

// Global prerequisites (identical across events), mirroring the server response order.
function globalChecks ({ awsOptedOut = false } = {}) {
  return [
    { key: 'active', label: 'Account active', passed: true },
    { key: 'atFacility', label: 'Currently assigned to a facility', passed: true },
    { key: 'hasPhoneNumber', label: 'Has a phone number', passed: true },
    { key: 'phoneVerified', label: 'Phone number verified', passed: true },
    { key: 'notificationsEnabled', label: 'Notifications active (not paused)', passed: true },
    { key: 'notOptedOut', label: 'Not opted out (internal DB)', passed: true },
    { key: 'awsNotOptedOut', label: 'Not opted out (AWS)', passed: !awsOptedOut },
  ];
}

// Event-specific conditions (audience, subscription).
function eventChecks ({ subscribed = true } = {}) {
  return [
    { key: 'audienceRole', label: 'In the audience for this event', passed: true },
    { key: 'subscribed', label: 'Subscribed to this event', passed: subscribed },
  ];
}

// An opted-out user (both DB + AWS) — so the "Override SMS Opt-out" action is offered.
function optedOutSmsState () {
  return {
    status: 200,
    data: {
      state: {
        phoneNumber: '+14155550100',
        phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
        smsConsentAt: null,
        smsOptedOutAt: '2026-02-01T00:00:00.000Z',
        notificationsEnabled: true,
        subscribedEvents: ['NEW_HOLD'],
        currentFacilityId: 'fac-1',
        currentFacilityName: 'RESET',
        smsWelcomedAt: null,
        roles: ['CUSTODY'],
        deactivatedAt: null,
        deletedAt: null,
      },
      otp: { lastSentAt: null, attempts: 0, expiresAt: null },
      gate: { global: globalChecks({ awsOptedOut: true }), events: [{ event: 'NEW_HOLD', passed: false, checks: eventChecks() }] },
      awsOptOut: { available: true, optedOut: true, optedOutTimestamp: '2026-02-01T00:00:00.000Z', endUserOptedOut: true },
      optHistory: { events: [], nextAllowedAfter: null },
    },
  };
}

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

  it('loads and shows SMS notification state, including the per-event gate', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Run SMS diagnostic' }));

    await waitFor(() => {
      expect(apiMocks.getSmsState).toHaveBeenCalledWith('user-1');
    });
    expect(await screen.findByText('+14155550100')).toBeInTheDocument();
    expect(screen.getByText('RESET')).toBeInTheDocument();
    // Global checklist + a per-event verdict (NEW_HOLD Yes, ARRIVAL No).
    expect(screen.getByText(/Global requirements/)).toBeInTheDocument();
    expect(screen.getByText('Account active')).toBeInTheDocument();
    expect(screen.getByText('Per-event requirements')).toBeInTheDocument();
    expect(screen.getByText('Meets all requirements?')).toBeInTheDocument();
    expect(screen.getByText('Subscribed to this event')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    // AWS opt-out surfaced as an Enrollment row.
    expect(screen.getByText('Opted out (AWS)')).toBeInTheDocument();
  });

  it('flags a mismatch when AWS says opted out but our record is clear', async () => {
    apiMocks.getSmsState.mockResolvedValue({
      status: 200,
      data: {
        state: {
          phoneNumber: '+14155550100',
          phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
          smsConsentAt: null,
          smsOptedOutAt: null,
          notificationsEnabled: true,
          subscribedEvents: ['NEW_HOLD'],
          currentFacilityId: 'fac-1',
          currentFacilityName: 'RESET',
          smsWelcomedAt: null,
          roles: ['CUSTODY'],
          deactivatedAt: null,
          deletedAt: null,
        },
        otp: { lastSentAt: null, attempts: 0, expiresAt: null },
        // AWS opt-out is a global check; it fails, so the event's verdict is No.
        gate: {
          global: globalChecks({ awsOptedOut: true }),
          events: [{ event: 'NEW_HOLD', passed: false, checks: eventChecks({ subscribed: true }) }],
        },
        awsOptOut: { available: true, optedOut: true, optedOutTimestamp: '2026-02-01T00:00:00.000Z', endUserOptedOut: true },
      },
    });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Run SMS diagnostic' }));

    // Mismatch callout: AWS opted out + our record clear.
    expect(await screen.findByText('Opt-out mismatch')).toBeInTheDocument();
    expect(screen.getByText(/disagrees with AWS/i)).toBeInTheDocument();
    // The global checklist shows the AWS requirement, and the verdict is No.
    expect(screen.getByText('Not opted out (AWS)')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('override opt-out: an opted-out user can be restored, calling the API and refreshing', async () => {
    apiMocks.getSmsState.mockResolvedValue(optedOutSmsState());
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Run SMS diagnostic' }));
    // Trigger button (only one on screen until the modal opens).
    await userEvent.click(await screen.findByRole('button', { name: 'Override SMS Opt-out' }));
    // Confirm inside the modal dialog.
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Override SMS Opt-out' }));

    await waitFor(() => expect(apiMocks.overrideSmsOptOut).toHaveBeenCalledWith('user-1'));
    // Diagnostic is refetched afterward (initial load + post-restore refresh).
    await waitFor(() => expect(apiMocks.getSmsState).toHaveBeenCalledTimes(2));
  });

  it('override opt-out: a 30-day block shows the limit explanation', async () => {
    apiMocks.getSmsState.mockResolvedValue(optedOutSmsState());
    apiMocks.overrideSmsOptOut.mockResolvedValue({ data: { outcome: 'blocked_30_day', awsReason: 'PHONE_NUMBER_CANNOT_BE_OPTED_IN' } });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Run SMS diagnostic' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Override SMS Opt-out' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Override SMS Opt-out' }));

    expect(await screen.findByText(/reset only once every/i)).toBeInTheDocument();
  });

  it('opt-out history: renders opt-out and opt-in events plus a next-allowed estimate', async () => {
    const state = optedOutSmsState();
    state.data.optHistory = {
      events: [
        { at: '2026-02-03T00:00:00.000Z', action: 'opt_in', source: 'admin', outcome: 'restored', awsReason: null, actor: 'Admin User' },
        { at: '2026-02-01T00:00:00.000Z', action: 'opt_out', source: 'inbound_stop', outcome: 'recorded', awsReason: null, actor: null },
      ],
      nextAllowedAfter: '2026-03-05T00:00:00.000Z',
    };
    apiMocks.getSmsState.mockResolvedValue(state);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Run SMS diagnostic' }));

    expect(await screen.findByText('Opt-out history')).toBeInTheDocument();
    // Action column distinguishes the two directions; Result shows the outcome.
    expect(screen.getByText('Opt-out')).toBeInTheDocument();
    expect(screen.getByText('Opt-in')).toBeInTheDocument();
    expect(screen.getByText('Recorded')).toBeInTheDocument(); // opt-out result
    expect(screen.getByText('Succeeded')).toBeInTheDocument(); // opt-in result
    expect(screen.getByText(/Earliest next opt-in/)).toBeInTheDocument();
  });
});
