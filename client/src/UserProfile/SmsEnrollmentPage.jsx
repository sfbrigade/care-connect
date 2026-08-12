import { useState } from 'react';
import { Anchor, Button, Checkbox, Container, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import NotificationPreferenceToggles from '@/components/NotificationPreferenceToggles';
import PhoneVerificationView from '@/components/PhoneVerificationView';
import ScreenHeading from '@/components/ScreenHeading';
import { useToast } from '@/components/ToastContext';
import { toE164US } from '@/utils/phone';

// First-time SMS enrollment as a full-page flow: phone + consent → verify
// → preferences → subscribe.
function SmsEnrollmentPage () {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const facilityName = facility?.name ?? 'RESET';
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // If user phone is already verified, skip straight to preferences.
  const [step, setStep] = useState(user?.phoneVerifiedAt ? 'prefs' : 'phone');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [e164, setE164] = useState('');
  const [initialResend, setInitialResend] = useState(30);
  const [selected, setSelected] = useState(new Set(user?.subscribedEvents ?? []));

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

  // X (quit): return to wherever enrollment was launched from (Home banner / Profile /
  // Settings). Steps advance via setState, so they add no history — navigate(-1) lands
  // on the true origin. Fall back to /profile on a direct load (no history to pop).
  function handleQuit () {
    if (location.key === 'default') navigate('/profile');
    else navigate(-1);
  }

  const canContinue = !!toE164US(phone) && consent && acceptedTerms;

  return (
    <>
      <Head>
        <title>Subscribe to SMS notifications</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          {/* Back arrow only on the verify step (→ phone, to fix a mistyped number);
              the X quits the flow on every step. */}
          {step === 'verify'
            ? <IconButtonLink icon={IconArrowLeft} onClick={() => setStep('phone')} aria-label='Go back' />
            : <span />}
          <IconButtonLink icon={IconX} onClick={handleQuit} aria-label='Close' />
        </Group>
      </Header>
      <Container>
        {step === 'phone' && (
          <Stack>
            <ScreenHeading label='Subscribe to SMS notifications' message='Enter your mobile number to get notified on important status changes.' />
            <TextInput
              label='Mobile number'
              placeholder='000-000-0000'
              value={phone}
              onChange={(e) => { setPhone(e.currentTarget.value); setPhoneError(null); }}
              error={phoneError}
              inputMode='tel'
            />
            <Checkbox
              checked={consent}
              onChange={(e) => setConsent(e.currentTarget.checked)}
              label={
                <Text size='md'>
                  By checking, I consent to receive arrival notifications and facility status updates from the City and County of San Francisco: CareConnect. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to opt-out.
                </Text>
              }
            />
            <Checkbox
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.currentTarget.checked)}
              label={
                <Text size='md'>
                  By checking, I accept the CareConnect SMS <Anchor href='/sms-terms' target='_blank' rel='noopener noreferrer'>Terms</Anchor> & <Anchor href='https://www.sf.gov/information/privacy-policy-sfgov' target='_blank' rel='noopener noreferrer'>Privacy Policy</Anchor>.
                </Text>
              }
            />
            <Group>
              <Button variant='primary' onClick={onContinue} disabled={!canContinue} loading={startMutation.isPending}>Continue</Button>
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
            <ScreenHeading label='Set your preferences' message='Choose the types of notifications you’d like to receive.' />
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
