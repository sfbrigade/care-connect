import { useState } from 'react';
import { Button, Container, Group, InputBase, Stack, TextInput, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { IMaskInput } from 'react-imask';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import PhoneVerificationView from '@/components/PhoneVerificationView';
import { useToast } from '@/components/ToastContext';
import { toE164US, formatUSPhone } from '@/utils/phone';

// Edit contact details (email read-only for now; mobile number editable). Changing
// the mobile number re-triggers phone verification (no re-consent needed — the
// backend allows an already-consented user to change their number).
function EditContactDetailsPage () {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState('form');
  // Pre-fill only a VERIFIED number; UI ignores an unverified number. Frozen at
  // mount so it can double as the baseline for the "has anything changed?" check.
  const [initialPhone] = useState(() => (user?.phoneVerifiedAt ? (formatUSPhone(user.phoneNumber) || '') : ''));
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState(null);
  const [e164, setE164] = useState('');
  const [initialResend, setInitialResend] = useState(30);

  const startMutation = useMutation({
    mutationFn: (number) => Api.users.startPhoneVerification({ phoneNumber: number }),
    onSuccess: (resp) => {
      setInitialResend(resp.data.resendAvailableInSeconds ?? 30);
      setStep('verify');
    },
    onError: (err) => setPhoneError(err.response?.data?.error || 'Something went wrong. Please try again.'),
  });

  function onSave () {
    setPhoneError(null);
    const number = toE164US(phone);
    if (!number) {
      setPhoneError('Enter a valid 10-digit US phone number.');
      return;
    }
    // Unchanged (and already verified) → nothing to do.
    if (number === user?.phoneNumber && user?.phoneVerifiedAt) {
      navigate('/profile');
      return;
    }
    setE164(number);
    startMutation.mutate(number);
  }

  // Save is only offered once the number both differs from what was there and is a
  // complete 10-digit US number — mid-typing is a normal state, not an error.
  const canSave = phone !== initialPhone && !!toE164US(phone);

  function handleBack () {
    if (step === 'verify') setStep('form');
    else navigate('/profile');
  }

  return (
    <>
      <Head>
        <title>Edit contact details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} onClick={handleBack} aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        {step === 'form' && (
          <Stack>
            <Title order={2}>Edit contact details</Title>
            <TextInput label='Email address' value={user?.email ?? ''} disabled />
            <InputBase
              label='Mobile number'
              placeholder='000-000-0000'
              component={IMaskInput}
              mask='000-000-0000'
              value={phone}
              onAccept={(value) => { setPhone(value); setPhoneError(null); }}
              error={phoneError}
              inputMode='tel'
            />
            <Group>
              <Button variant='light' onClick={() => navigate('/profile')}>Cancel</Button>
              <Button variant='primary' onClick={onSave} disabled={!canSave} loading={startMutation.isPending}>Save changes</Button>
            </Group>
          </Stack>
        )}

        {step === 'verify' && (
          <PhoneVerificationView
            phoneNumber={e164}
            initialResendSeconds={initialResend}
            onVerified={() => {
              showToast('Your mobile number has been saved', 'success');
              navigate('/profile');
            }}
          />
        )}
      </Container>
    </>
  );
}

export default EditContactDetailsPage;
