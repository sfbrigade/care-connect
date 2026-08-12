import { useEffect, useState } from 'react';
import { Button, PinInput, Stack, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import ScreenHeading from '@/components/ScreenHeading';
import { formatUSPhone } from '@/utils/phone';
import { formatCountdown } from '@/utils/format';

// Shared "enter the 6-digit code" step, reused by first-time enrollment and by
// changing a number from Contact details. Assumes a code was already sent (the
// parent called /me/phone/start). On success calls onVerified().
// initialResendSeconds defaults to 0 so "Resend code" is available immediately on
// landing (the countdown only starts once the user actually resends).
function PhoneVerificationView ({ phoneNumber, initialResendSeconds = 0, onVerified }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  const [resendIn, setResendIn] = useState(initialResendSeconds);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verifyMutation = useMutation({
    mutationFn: (c) => Api.users.verifyPhone(c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      onVerified?.();
    },
    onError: (err) => setCodeError(err.response?.data?.error || 'Invalid code. Check the code and try again.'),
  });

  const resendMutation = useMutation({
    mutationFn: () => Api.users.resendPhoneCode(),
    onSuccess: (resp) => {
      setCode(''); setCodeError(null);
      setResendIn(resp.data.resendAvailableInSeconds ?? 30);
    },
    onError: (err) => setCodeError(err.response?.data?.error || 'Could not resend the code.'),
  });

  return (
    <Stack>
      <ScreenHeading label='Enter verification code' message={`We’ve sent a 6-digit code to ${formatUSPhone(phoneNumber)}`} />
      <PinInput
        length={6}
        type='number'
        oneTimeCode
        value={code}
        onChange={(v) => { setCode(v); setCodeError(null); }}
        onComplete={(v) => verifyMutation.mutate(v)}
        placeholder=''
        error={!!codeError}
        aria-label='Verification code'
      />
      {codeError && <Text c='red' size='sm'>{codeError}</Text>}
      <Stack gap='sm' align='flex-start'>
        <Button
          variant='primary'
          onClick={() => verifyMutation.mutate(code)}
          disabled={code.length !== 6}
          loading={verifyMutation.isPending}
        >
          Verify and continue
        </Button>
        <Button
          variant='white'
          color='indigo.6'
          onClick={() => resendMutation.mutate()}
          disabled={resendIn > 0 || resendMutation.isPending}
        >
          {resendIn > 0 ? `Resend code in ${formatCountdown(resendIn)}` : 'Resend code'}
        </Button>
      </Stack>
    </Stack>
  );
}

export default PhoneVerificationView;
