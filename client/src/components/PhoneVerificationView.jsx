import { useEffect, useState } from 'react';
import { Anchor, Button, Group, PinInput, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { formatCountdown, formatUSPhone } from '@/utils/phone';

// Shared "enter the 6-digit code" step, reused by first-time enrollment and by
// changing a number from Contact details. Assumes a code was already sent (the
// parent called /me/phone/start). On success calls onVerified().
function PhoneVerificationView ({ phoneNumber, initialResendSeconds = 30, onVerified }) {
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
    onError: (err) => setCodeError(err.response?.data?.error || 'That code is incorrect. Try again.'),
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
      <div>
        <Title order={2}>Enter verification code</Title>
        <Text c='dimmed'>We’ve sent a 6-digit code to {formatUSPhone(phoneNumber)}</Text>
      </div>
      <PinInput
        length={6}
        type='number'
        oneTimeCode
        value={code}
        onChange={(v) => { setCode(v); setCodeError(null); }}
        onComplete={(v) => verifyMutation.mutate(v)}
        error={!!codeError}
        aria-label='Verification code'
      />
      {codeError && <Text c='red' size='sm'>{codeError}</Text>}
      <Group justify='space-between'>
        {resendIn > 0
          ? <Text c='dimmed' size='sm'>Resend code in {formatCountdown(resendIn)}</Text>
          : <Anchor component='button' type='button' size='sm' onClick={() => resendMutation.mutate()}>Resend code</Anchor>}
        <Button
          onClick={() => verifyMutation.mutate(code)}
          disabled={code.length !== 6}
          loading={verifyMutation.isPending}
        >
          Verify and continue
        </Button>
      </Group>
    </Stack>
  );
}

export default PhoneVerificationView;
