import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import EditContactDetailsPage from './EditContactDetailsPage';

const { mockStartVerification, mockNavigate, mockUserRef } = vi.hoisted(() => ({
  mockStartVerification: vi.fn(),
  mockNavigate: vi.fn(),
  mockUserRef: { current: null },
}));

vi.mock('@/Api', () => ({
  default: {
    users: {
      startPhoneVerification: mockStartVerification,
      verifyPhone: vi.fn(),
      resendPhoneCode: vi.fn(),
    },
  },
}));

vi.mock('@/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUserRef.current }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
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
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EditContactDetailsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

const saveButton = () => screen.getByRole('button', { name: /save changes/i });
const phoneField = () => screen.getByLabelText(/mobile number/i);

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRef.current = {
    id: 'user-1',
    email: 'deputy@careconnectsf.org',
    phoneNumber: '+14155550199',
    phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
  };
  mockStartVerification.mockResolvedValue({ data: { resendAvailableInSeconds: 30 } });
});

afterEach(cleanup);

describe('EditContactDetailsPage', () => {
  it('pre-fills the verified number and disables Save until something changes', () => {
    renderPage();

    expect(phoneField()).toHaveValue('415-555-0199');
    expect(saveButton()).toBeDisabled();
  });

  it('keeps Save disabled while the new number is incomplete', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(phoneField());
    await user.type(phoneField(), '41555');

    expect(saveButton()).toBeDisabled();
  });

  it('keeps Save disabled when the field is cleared entirely', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(phoneField());

    expect(saveButton()).toBeDisabled();
  });

  it('keeps Save disabled when the same number is retyped', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(phoneField());
    await user.type(phoneField(), '4155550199');

    expect(saveButton()).toBeDisabled();
  });

  it('enables Save for a different, complete number and starts verification', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(phoneField());
    await user.type(phoneField(), '2025551234');
    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());

    await waitFor(() => expect(mockStartVerification).toHaveBeenCalledWith({ phoneNumber: '+12025551234' }));
  });

  it('enables Save when the user has no verified number on file', async () => {
    const user = userEvent.setup();
    mockUserRef.current = { id: 'user-1', email: 'deputy@careconnectsf.org', phoneNumber: null, phoneVerifiedAt: null };
    renderPage();

    expect(phoneField()).toHaveValue('');
    expect(saveButton()).toBeDisabled();

    await user.type(phoneField(), '4155550199');

    expect(saveButton()).toBeEnabled();
  });
});
