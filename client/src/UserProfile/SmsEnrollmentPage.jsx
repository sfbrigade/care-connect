import { useState } from 'react';
import { Anchor, Button, Checkbox, Container, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import NotificationPreferenceToggles from '@/components/NotificationPreferenceToggles';
import PhoneVerificationView from '@/components/PhoneVerificationView';
import { useToast } from '@/components/ToastContext';
import { toE164US } from '@/utils/phone';

// First-time SMS enrollment as a full-page flow (D6/D8): phone + consent → verify
// → preferences → subscribe. The verify step is shared with contact-detail edits.
function SmsEnrollmentPage () {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const facilityName = facility?.name ?? 'RESET';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [e164, setE164] = useState('');
  const [initialResend, setInitialResend] = useState(30);
  const [selected, setSelected] = useState(new Set());

  const startMutation = useMutation({
    mutationFn: (number) => Api.users.startPhoneVerification({ phoneNumber: number, consent, acceptedTerms }),
    onSuccess: (resp) => {
      setInitialResend(resp.data.resendAvailableInSeconds ?? 30);
      setStep('verify');
    },
    onError: (err) => setPhoneError(err.response?.data?.error || 'Something went wrong. Please try again.'),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => Api.users.update(user.id, { subscribedEvents: [...selected], notificationsEnabled: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast("You're subscribed", 'success', 4000, 'Change your SMS preferences from your account.');
      navigate('/');
    },
    onError: () => showToast('Couldn’t save your subscription', 'error', 4000, 'Please try again.'),
  });

  function onContinue () {
    setPhoneError(null);
    const number = toE164US(phone);
    if (!number) {
      setPhoneError('Enter a valid 10-digit US phone number.');
      return;
    }
    setE164(number);
    startMutation.mutate(number);
  }

  function toggleEvent (value) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleBack () {
    if (step === 'verify') setStep('phone');
    else navigate('/');
  }

  const canContinue = !!toE164US(phone) && consent && acceptedTerms;

  return (
    <>
      <Head>
        <title>Enable SMS notifications</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} onClick={handleBack} aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        {step === 'phone' && (
          <Stack>
            <div>
              <Title order={2}>Enable SMS notifications</Title>
              <Text c='dimmed'>Enter your phone number to get notified on important status changes.</Text>
            </div>
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
            <Group>
              <Button variant='light' color='red' onClick={() => navigate('/')}>Cancel</Button>
              <Button variant='secondary' onClick={onContinue} disabled={!canContinue} loading={startMutation.isPending}>Continue</Button>
            </Group>
          </Stack>
        )}

        {step === 'verify' && (
          <PhoneVerificationView
            phoneNumber={e164}
            initialResendSeconds={initialResend}
            onVerified={() => setStep('prefs')}
          />
        )}

        {step === 'prefs' && (
          <Stack>
            <div>
              <Title order={2}>Set your preferences</Title>
              <Text c='dimmed'>Choose the types of notifications you’d like to receive.</Text>
            </div>
            <NotificationPreferenceToggles selected={selected} onToggle={toggleEvent} facilityName={facilityName} />
            <Group>
              <Button
                variant='secondary'
                onClick={() => subscribeMutation.mutate()}
                disabled={selected.size === 0}
                loading={subscribeMutation.isPending}
              >
                Subscribe
              </Button>
            </Group>
          </Stack>
        )}
      </Container>
    </>
  );
}

export default SmsEnrollmentPage;
