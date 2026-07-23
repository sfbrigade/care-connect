import { useEffect, useState } from 'react';
import { ActionIcon, Anchor, Button, Checkbox, Group, Modal, PinInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import NotificationPreferenceToggles from '@/components/NotificationPreferenceToggles';
import { useToast } from '@/components/ToastContext';

// US phone input → E.164. Returns null if not a valid 10-digit US number.
function toE164US (input) {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function formatCountdown (s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// First-time SMS enrollment wizard (D6/D8): phone + consent → verify code →
// choose preferences → subscribe. Backend routes: /me/phone/{start,resend,verify}
// then PATCH /users/:id for the preferences.
function SmsEnrollmentModal ({ opened, onClose, onSubscribed }) {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const facilityName = facility?.name ?? 'RESET';
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const [selected, setSelected] = useState(new Set());

  // Reset everything when the modal (re)opens.
  useEffect(() => {
    if (!opened) return;
    setStep('phone');
    setPhone(''); setConsent(false); setAcceptedTerms(false); setPhoneError(null);
    setCode(''); setCodeError(null); setResendIn(0); setSelected(new Set());
  }, [opened]);

  // Resend countdown tick.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const startMutation = useMutation({
    mutationFn: (e164) => Api.users.startPhoneVerification({ phoneNumber: e164, consent, acceptedTerms }),
    onSuccess: (resp) => {
      setStep('verify');
      setCode(''); setCodeError(null);
      setResendIn(resp.data.resendAvailableInSeconds ?? 30);
    },
    onError: (err) => setPhoneError(err.response?.data?.error || 'Something went wrong. Please try again.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (c) => Api.users.verifyPhone(c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setStep('prefs');
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

  const subscribeMutation = useMutation({
    mutationFn: () => Api.users.update(user.id, { subscribedEvents: [...selected], notificationsEnabled: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast("You're subscribed", 'success', 4000, 'Change your SMS preferences in your account settings.');
      onSubscribed?.();
      onClose();
    },
    onError: () => showToast('Couldn’t save your subscription', 'error', 4000, 'Please try again.'),
  });

  function onContinue () {
    setPhoneError(null);
    const e164 = toE164US(phone);
    if (!e164) {
      setPhoneError('Enter a valid 10-digit US phone number.');
      return;
    }
    startMutation.mutate(e164);
  }

  function toggleEvent (value) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const canContinue = !!toE164US(phone) && consent && acceptedTerms;

  return (
    <Modal opened={opened} onClose={onClose} centered title='Enable SMS notifications' size='md'>
      {step === 'phone' && (
        <Stack>
          <Text>Enter your phone number to get notified on important status changes.</Text>
          <TextInput
            label='Phone number'
            placeholder='000-000-0000'
            value={phone}
            onChange={(e) => { setPhone(e.currentTarget.value); setPhoneError(null); }}
            error={phoneError}
            inputMode='tel'
          />
          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.currentTarget.checked)}
            label='By checking, you consent to receive arrival notifications and facility status updates from the City and County of San Francisco: CareConnect. Message may vary. Message and data rates may apply. Reply HELP for help or STOP to opt-out.'
          />
          <Checkbox
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.currentTarget.checked)}
            label={
              <Text size='sm'>
                By checking, I accept <Anchor href='#'>Terms of Service</Anchor> & <Anchor href='#'>Privacy Policy</Anchor>.
              </Text>
            }
          />
          <Group justify='flex-end'>
            <Button onClick={onContinue} disabled={!canContinue} loading={startMutation.isPending}>Continue</Button>
          </Group>
        </Stack>
      )}

      {step === 'verify' && (
        <Stack>
          <Group gap='xs'>
            <ActionIcon variant='subtle' color='gray' aria-label='Back' onClick={() => setStep('phone')}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={4}>Enter verification code</Title>
          </Group>
          <Text>We’ve sent a 6-digit code to {toE164US(phone)}</Text>
          <PinInput
            length={6}
            type='number'
            oneTimeCode
            value={code}
            onChange={(v) => { setCode(v); setCodeError(null); }}
            error={!!codeError}
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
      )}

      {step === 'prefs' && (
        <Stack>
          <div>
            <Title order={4}>Set your preferences</Title>
            <Text c='dimmed'>Choose the types of notifications you’d like to receive.</Text>
          </div>
          <NotificationPreferenceToggles selected={selected} onToggle={toggleEvent} facilityName={facilityName} />
          <Group justify='flex-end'>
            <Button
              onClick={() => subscribeMutation.mutate()}
              disabled={selected.size === 0}
              loading={subscribeMutation.isPending}
            >
              Subscribe
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export default SmsEnrollmentModal;
