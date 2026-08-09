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
      <Text size='sm' c='dimmed' style={{ minWidth: 160 }}>{label}</Text>
      {/* span, not the default <p>: some values render a Badge (<div>). */}
      <Text span size='sm'>{children}</Text>
    </Group>
  );
}

// Live AWS opt-out status, plus a drift warning when it disagrees with our own
// smsOptedOutAt mirror (the main thing this diagnostic exists to catch).
function AwsOptOutSummary ({ awsOptOut, dbOptedOut }) {
  if (!awsOptOut.available) {
    return <Text size='sm' c='dimmed'>AWS opt-out status unavailable ({awsOptOut.reason}).</Text>;
  }
  const drift = awsOptOut.optedOut !== dbOptedOut;
  return (
    <Stack gap='xs'>
      <StateRow label='Status'>
        {awsOptOut.optedOut
          ? <Badge color='red' variant='light'>Opted out{awsOptOut.optedOutTimestamp ? ` — ${fmtDate(awsOptOut.optedOutTimestamp)}` : ''}</Badge>
          : <Badge color='green' variant='light'>Not opted out</Badge>}
      </StateRow>
      {drift && (
        <Alert color='orange' variant='light'>
          Mismatch: AWS says <strong>{awsOptOut.optedOut ? 'opted out' : 'not opted out'}</strong>, but our record says{' '}
          <strong>{dbOptedOut ? 'opted out' : 'not opted out'}</strong>. Sends may silently succeed or bounce until this is reconciled.
        </Alert>
      )}
    </Stack>
  );
}

function GateCell ({ passed }) {
  if (passed == null) return <Text size='sm' c='dimmed'>—</Text>;
  return passed
    ? <IconCheck size={18} color='var(--mantine-color-green-6)' aria-label='met' />
    : <IconX size={18} color='var(--mantine-color-red-6)' aria-label='not met' />;
}

// Matrix of the recipient-gate conditions: one column per event type, one row per
// condition, a ✓/✗ in each cell, and a final "Would receive" verdict row. Reads far
// more clearly than a per-event "No — <requirement>" sentence. Rows are the ordered
// union of condition keys across events (all events share the same set in practice).
function GateMatrix ({ gate }) {
  if (!gate?.length) return null;

  const seen = new Set();
  const rows = [];
  for (const g of gate) {
    for (const c of g.checks) {
      if (!seen.has(c.key)) { seen.add(c.key); rows.push({ key: c.key, label: c.label }); }
    }
  }
  const passedFor = (g, key) => g.checks.find((c) => c.key === key)?.passed;

  return (
    <Table.ScrollContainer minWidth={360}>
      <Table withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Requirement</Table.Th>
            {gate.map((g) => <Table.Th key={g.event} ta='center'>{g.event}</Table.Th>)}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.key}>
              <Table.Td><Text size='sm'>{row.label}</Text></Table.Td>
              {gate.map((g) => (
                <Table.Td key={g.event} ta='center'><GateCell passed={passedFor(g, row.key)} /></Table.Td>
              ))}
            </Table.Tr>
          ))}
          <Table.Tr>
            <Table.Td><Text size='sm' fw={600}>Would receive</Text></Table.Td>
            {gate.map((g) => (
              <Table.Td key={g.event} ta='center'>
                {g.passed
                  ? <Badge color='green' variant='light'>Yes</Badge>
                  : <Badge color='gray' variant='light'>No</Badge>}
              </Table.Td>
            ))}
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
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
        <title>Login Support</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/admin/users' aria-label='Go back' />
      </Header>
      <Container>
        <Stack>
          <Title>Login support</Title>
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
                  <Text fw={600} size='sm'>Enrollment</Text>
                  <StateRow label='Phone number'>{smsState.state.phoneNumber ? <Code>{smsState.state.phoneNumber}</Code> : '—'}</StateRow>
                  <StateRow label='Verified'>{fmtDate(smsState.state.phoneVerifiedAt)}</StateRow>
                  <StateRow label='Consented'>{fmtDate(smsState.state.smsConsentAt)}</StateRow>
                  <StateRow label='Notifications'>{smsState.state.notificationsEnabled ? 'Active' : 'Paused'}</StateRow>
                  <StateRow label='Subscribed events'>{smsState.state.subscribedEvents.length ? smsState.state.subscribedEvents.join(', ') : 'None'}</StateRow>
                  <StateRow label='Current facility'>{smsState.state.currentFacilityName ?? '—'}</StateRow>
                  <StateRow label='Welcomed'>{fmtDate(smsState.state.smsWelcomedAt)}</StateRow>
                  <StateRow label='Opted out (internal DB)'>{fmtDate(smsState.state.smsOptedOutAt)}</StateRow>
                </Stack>

                <Stack gap='xs'>
                  <Text fw={600} size='sm'>AWS opt-out list</Text>
                  <AwsOptOutSummary awsOptOut={smsState.awsOptOut} dbOptedOut={!!smsState.state.smsOptedOutAt} />
                </Stack>

                <Stack gap='xs'>
                  <Text fw={600} size='sm'>Would receive notifications</Text>
                  <GateMatrix gate={smsState.gate} />
                </Stack>

                <Stack gap='xs'>
                  <Text fw={600} size='sm'>Verification (OTP)</Text>
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
