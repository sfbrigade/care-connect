import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';

import theme from '@/AppTheme';
import PhoneVerificationView from './PhoneVerificationView';

const { mockVerify } = vi.hoisted(() => ({ mockVerify: vi.fn() }));

vi.mock('@/Api', () => ({
  default: { users: { verifyPhone: mockVerify, resendPhoneCode: vi.fn() } },
}));

function setup () {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <PhoneVerificationView phoneNumber='+14155550199' />
      </MantineProvider>
    </QueryClientProvider>
  );
}

const pinCells = () => [...document.querySelectorAll('.mantine-PinInput-input')];

describe('PhoneVerificationView', () => {
  beforeEach(() => mockVerify.mockReset().mockResolvedValue({ data: {} }));
  afterEach(cleanup);

  it('focuses the first pin cell on mount, so typing goes straight in', () => {
    setup();
    expect(document.activeElement).toBe(pinCells()[0]);
  });

  // Submitting is explicit by design: auto-submitting on the 6th keystroke spends
  // one of the 5 server-side attempts on a typo the user hasn't seen yet.
  it('does not submit on the 6th digit', async () => {
    setup();
    await userEvent.keyboard('123456');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('submits on Enter once 6 digits are entered', async () => {
    setup();
    await userEvent.keyboard('123456{Enter}');
    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(mockVerify).toHaveBeenCalledWith('123456');
  });

  it('ignores Enter before 6 digits are entered', async () => {
    setup();
    await userEvent.keyboard('12345{Enter}');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('enables the button only at 6 digits, and submits on click', async () => {
    setup();
    const button = screen.getByRole('button', { name: /verify and continue/i });
    expect(button).toBeDisabled();
    await userEvent.keyboard('123456');
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(mockVerify).toHaveBeenCalledWith('123456');
  });
});
