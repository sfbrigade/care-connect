import { useState } from 'react';
import { useParams } from 'react-router';
import { Alert, Badge, Button, Code, Container, Divider, Group, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { StatusCodes } from 'http-status-codes';
import { IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '—');

function StateRow ({ label, children }) {
  return (
    <Group gap='xs' wrap='nowrap' align='baseline'>
      <Text size='md' c='dimmed' style={{ minWidth: 180 }}>{label}</Text>
      {/* span, not the default <p>: some values render a Badge (<div>). */}
      <Text span size='md'>{children}</Text>
    </Group>
  );
}

// Live AWS opt-out status as an Enrollment row, plus a drift warning when it disagrees
// with our own smsOptedOutAt mirror (the main thing this diagnostic exists to catch).
function AwsOptOutRows ({ awsOptOut, dbOptedOut }) {
  const awsOut = Boolean(awsOptOut.optedOut);
  const drift = awsOptOut.available && awsOut !== dbOptedOut;
  let value;
  if (!awsOptOut.available) value = <Text span c='dimmed'>Unavailable ({awsOptOut.reason})</Text>;
  else if (awsOptOut.optedOut) value = awsOptOut.optedOutTimestamp ? fmtDate(awsOptOut.optedOutTimestamp) : 'Yes';
  else value = '—';

  return (
    <>
      <StateRow label='Opted out (AWS)'>{value}</StateRow>
      {drift && (
        <Alert color='orange' variant='light' title='Opt-out mismatch'>
          {awsOut
            // We only gate on our own record, so a clear record means we attempt the send.
            ? 'This number is on AWS’s opt-out list, but our record is clear — so we attempt to send and AWS rejects every message.'
            // Our record blocks the send before it's ever attempted.
            : 'Our record marks this number opted out, but it isn’t on AWS’s opt-out list — so we never attempt a send, even though AWS would accept it.'}
        </Alert>
      )}
    </>
  );
}

function GateCell ({ passed }) {
  if (passed == null) return <Text size='md' c='dimmed'>—</Text>;
  return passed
    ? <IconCheck size={18} color='var(--mantine-color-green-6)' aria-label='met' />
    : <IconX size={18} color='var(--mantine-color-red-6)' aria-label='not met' />;
}

// The recipient gate has two parts. GLOBAL prerequisites apply to every notification
// (a single failure blocks all SMS), so they render once as a checklist. EVENT-specific
// conditions (audience, subscription) vary by event, so they render as a compact matrix
// with the "Would receive" verdict — which also reflects any global failure.
function GateSection ({ gate }) {
  if (!gate) return null;
  const { global = [], events = [] } = gate;

  return (
    <>
      <Stack gap={6}>
        <Title order={4}>Global requirements</Title>
        <Text size='sm' c='dimmed'>All must pass to receive any SMS.</Text>
        {global.map((c) => (
          <Group key={c.key} gap='xs' wrap='nowrap' align='center'>
            <GateCell passed={c.passed} />
            <Text size='md'>{c.label}</Text>
          </Group>
        ))}
      </Stack>

      {events.length > 0 && (
        <Stack gap='xs'>
          <Title order={4}>Per-event requirements</Title>
          <Table.ScrollContainer minWidth={360}>
            <Table withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Requirement</Table.Th>
                  {events.map((e) => <Table.Th key={e.event} ta='center'>{e.event}</Table.Th>)}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events[0].checks.map((row, i) => (
                  <Table.Tr key={row.key}>
                    <Table.Td><Text size='md'>{row.label}</Text></Table.Td>
                    {events.map((e) => (
                      <Table.Td key={e.event} ta='center'><GateCell passed={e.checks[i]?.passed} /></Table.Td>
                    ))}
                  </Table.Tr>
                ))}
                <Table.Tr>
                  <Table.Td><Text size='md' fw={600}>Meets all requirements?</Text></Table.Td>
                  {events.map((e) => (
                    <Table.Td key={e.event} ta='center'>
                      {e.passed
                        ? <Badge color='green' variant='light'>Yes</Badge>
                        : <Badge color='red' variant='light'>No</Badge>}
                    </Table.Td>
                  ))}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}
    </>
  );
}

function AdminUserSupportPage () {
  const { userId } = useParams();
  const { showToast } = useToast();
  const [mfaCode, setMfaCode] = useState(null);
  const [smsState, setSmsState] = useState(null);
  const [passwordValues, setPasswordValues] = useState({
    password: '',
    passwordConfirmation: '',
  });

  const passwordForm = useForm({
    mode: 'uncontrolled',
    initialValues: {
      password: '',
      passwordConfirmation: '',
    },
    validate: {
      password: hasLength({ min: 12 }, 'Passwords must be at least 12 characters.'),
      passwordConfirmation: (value, values) => value === values.password ? null : 'Passwords do not match.',
    },
  });

  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId).then(response => response.data),
  });

  const setPasswordMutation = useMutation({
    mutationFn: (values) => Api.users.setPassword(userId, values.password),
    onSuccess: () => {
      passwordForm.reset();
      setPasswordValues({
        password: '',
        passwordConfirmation: '',
      });
      showToast('The user\'s password has been updated', 'success');
    },
    onError: (errors) => passwordForm.setErrors(errors),
  });

  const getMfaCodeMutation = useMutation({
    mutationFn: () => Api.users.getMfaCode(userId),
    onSuccess: (response) => {
      if (response.status === StatusCodes.NO_CONTENT) {
        setMfaCode(null);
        showToast('No active MFA code found for this user', 'info');
        return;
      }
      setMfaCode(response.data);
    },
    onError: () => {
      setMfaCode(null);
      showToast('Unable to load MFA code', 'error');
    },
  });

  const getSmsStateMutation = useMutation({
    mutationFn: () => Api.users.getSmsState(userId),
    onSuccess: (response) => setSmsState(response.data),
    onError: () => {
      setSmsState(null);
      showToast('Unable to load SMS state', 'error');
    },
  });

  const passwordInputProps = passwordForm.getInputProps('password');
  const passwordConfirmationInputProps = passwordForm.getInputProps('passwordConfirmation');
  const canSetPassword = !!passwordValues.password &&
    !!passwordValues.passwordConfirmation &&
    passwordValues.password === passwordValues.passwordConfirmation;
  const passwordConfirmationError = passwordValues.passwordConfirmation &&
    !passwordValues.password.startsWith(passwordValues.passwordConfirmation)
    ? 'Passwords do not match.'
    : null;

  return (
    <>
      <Head>
        <title>User Support</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/admin/users' aria-label='Go back' />
      </Header>
      <Container>
        <Stack>
          <Title>User support</Title>
          {user && (
            <Text c='dimmed'>
              {user.firstName} {user.lastName} &lt;{user.email}&gt;
            </Text>
          )}
          <Divider />
          <form onSubmit={passwordForm.onSubmit(setPasswordMutation.mutateAsync)}>
            <Stack>
              <Title order={3}>Password support</Title>
              {passwordForm.errors?._form && <Alert color='red'>{passwordForm.errors._form}</Alert>}
              <TextInput
                {...passwordInputProps}
                key={passwordForm.key('password')}
                label='New password'
                type='password'
                autoComplete='new-password'
                disabled={setPasswordMutation.isPending}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  passwordInputProps.onChange?.(event);
                  setPasswordValues((current) => ({
                    ...current,
                    password: value,
                  }));
                }}
              />
              <TextInput
                {...passwordConfirmationInputProps}
                key={passwordForm.key('passwordConfirmation')}
                label='Confirm new password'
                type='password'
                autoComplete='new-password'
                disabled={setPasswordMutation.isPending}
                error={passwordConfirmationError}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  passwordConfirmationInputProps.onChange?.(event);
                  setPasswordValues((current) => ({
                    ...current,
                    passwordConfirmation: value,
                  }));
                }}
              />
              <Group>
                <Button disabled={!canSetPassword} loading={setPasswordMutation.isPending} type='submit'>Set password</Button>
              </Group>
            </Stack>
          </form>
          <Divider />
          <Stack>
            <Title order={3}>MFA support</Title>
            <Group>
              <Button
                loading={getMfaCodeMutation.isPending}
                onClick={() => getMfaCodeMutation.mutate()}
                type='button'
              >
                Show active MFA code
              </Button>
            </Group>
            {mfaCode && (
              <Stack gap='xs'>
                <Text size='sm'>Active code: <Code>{mfaCode.code}</Code></Text>
                <Text size='sm' c='dimmed'>Expires at {new Date(mfaCode.expiresAt).toLocaleString()}</Text>
                <Text size='sm' c='dimmed'>Attempts remaining: {mfaCode.attemptsRemaining}</Text>
              </Stack>
            )}
          </Stack>
          <Divider />
          <Stack>
            <Title order={3}>SMS notifications</Title>
            <Group>
              <Button
                loading={getSmsStateMutation.isPending}
                onClick={() => getSmsStateMutation.mutate()}
                type='button'
              >
                Show SMS diagnostic
              </Button>
            </Group>
            {smsState && (
              <Stack gap='lg'>
                <Stack gap='xs'>
                  <Title order={4}>Enrollment</Title>
                  <StateRow label='Phone number'>{smsState.state.phoneNumber ? <Code>{smsState.state.phoneNumber}</Code> : '—'}</StateRow>
                  <StateRow label='Verified'>{fmtDate(smsState.state.phoneVerifiedAt)}</StateRow>
                  <StateRow label='Consented'>{fmtDate(smsState.state.smsConsentAt)}</StateRow>
                  <StateRow label='Notifications'>{smsState.state.notificationsEnabled ? 'Active' : 'Paused'}</StateRow>
                  <StateRow label='Subscribed events'>{smsState.state.subscribedEvents.length ? smsState.state.subscribedEvents.join(', ') : 'None'}</StateRow>
                  <StateRow label='Current facility'>{smsState.state.currentFacilityName ?? '—'}</StateRow>
                  <StateRow label='Welcomed'>{fmtDate(smsState.state.smsWelcomedAt)}</StateRow>
                  <StateRow label='Opted out (internal DB)'>{fmtDate(smsState.state.smsOptedOutAt)}</StateRow>
                  <AwsOptOutRows awsOptOut={smsState.awsOptOut} dbOptedOut={!!smsState.state.smsOptedOutAt} />
                </Stack>

                <GateSection gate={smsState.gate} />

                <Stack gap='xs'>
                  <Title order={4}>Verification (OTP)</Title>
                  <StateRow label='Last code sent'>{fmtDate(smsState.otp.lastSentAt)}</StateRow>
                  <StateRow label='Attempts'>{smsState.otp.attempts}</StateRow>
                  <StateRow label='Code expires'>{fmtDate(smsState.otp.expiresAt)}</StateRow>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

export default AdminUserSupportPage;
