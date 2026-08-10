import { useState } from 'react';
import { useParams } from 'react-router';
import { Alert, Badge, Button, Code, Container, Divider, Group, Modal, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { StatusCodes } from 'http-status-codes';
import { IconAlertCircle, IconArrowLeft, IconCheck, IconRefresh, IconX } from '@tabler/icons-react';

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
// with our own smsOptedOutAt mirror
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
        <Alert color='yellow' variant='light' radius='lg' icon={<IconAlertCircle />} title='Opt-out mismatch'>
          Our internal opt-out record disagrees with AWS. This should not happen; developers should investigate.
        </Alert>
      )}
    </>
  );
}

// What was attempted (direction).
function actionLabel (e) {
  return e.action === 'opt_out' ? 'Opt-out' : 'Opt-in';
}

// What happened (outcome) — a colored badge. Opt-outs always just record; opt-ins vary.
function resultBadge (e) {
  if (e.action === 'opt_out') return { label: 'Recorded', color: 'gray' };
  if (e.outcome === 'restored') return { label: 'Succeeded', color: 'green' };
  if (e.outcome === 'blocked_30_day') return { label: 'Blocked', color: 'yellow' };
  return { label: 'Failed', color: 'red' };
}

// Who / how it happened.
function eventSource (e) {
  if (e.source === 'admin') return `admin override (${e.actor ?? 'admin'})`;
  if (e.source === 'inbound_stop') return 'user (STOP)';
  if (e.source === 'inbound_start') return 'user (START)';
  return e.source;
}

// Recent opt-out / opt-in events for this number (inbound STOP/START + admin override),
// as a table, plus an estimated earliest next opt-in.
function OptHistory ({ optHistory }) {
  const events = optHistory?.events ?? [];
  return (
    <Stack gap='xs'>
      {optHistory?.nextAllowedAfter && (
        <Text size='sm' c='dimmed'>
          Earliest next opt-in ≈ {fmtDate(optHistory.nextAllowedAfter)} (30 days after the last successful
          opt-in).
        </Text>
      )}
      {events.length === 0
        ? <Text size='sm' c='dimmed'>No opt-out or opt-in events recorded.</Text>
        : (
          <Table.ScrollContainer minWidth={480}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Result</Table.Th>
                  <Table.Th>When</Table.Th>
                  <Table.Th>By</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events.map((e, i) => {
                  const result = resultBadge(e);
                  return (
                    <Table.Tr key={i}>
                      <Table.Td><Text size='sm'>{actionLabel(e)}</Text></Table.Td>
                      <Table.Td><Badge color={result.color} variant='light'>{result.label}</Badge></Table.Td>
                      <Table.Td><Text size='sm'>{fmtDate(e.at)}</Text></Table.Td>
                      <Table.Td><Text size='sm'>{eventSource(e)}</Text></Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          )}
    </Stack>
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
      <Divider color='gray.2' />
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
        <>
          <Divider color='gray.2' />
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
        </>
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

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideResult, setOverrideResult] = useState(null); // 'blocked_30_day' | 'error' | null

  const overrideMutation = useMutation({
    mutationFn: () => Api.users.overrideSmsOptOut(userId),
    onSuccess: (response) => {
      const { outcome } = response.data;
      setOverrideOpen(false);
      setOverrideResult(outcome === 'restored' ? null : outcome);
      if (outcome === 'restored') showToast('SMS delivery restored', 'success');
      getSmsStateMutation.mutate(); // refresh state + history
    },
    onError: () => {
      setOverrideOpen(false);
      setOverrideResult('error');
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
                // Clear the transient restore-result banner on a MANUAL reload only (not in
                // the mutation — a restore attempt also refetches, and would wipe its own result).
                onClick={() => { setOverrideResult(null); getSmsStateMutation.mutate(); }}
                type='button'
                leftSection={smsState ? <IconRefresh size={16} /> : undefined}
              >
                {smsState ? 'Reload SMS diagnostic' : 'Run SMS diagnostic'}
              </Button>
            </Group>
            {smsState && (
              <Stack gap='lg'>
                <Stack gap='xs'>
                  <Title order={4}>Enrollment</Title>
                  <StateRow label='Phone number'>{smsState.state.phoneNumber ?? '—'}</StateRow>
                  <StateRow label='Verified'>{fmtDate(smsState.state.phoneVerifiedAt)}</StateRow>
                  <StateRow label='Consented'>{fmtDate(smsState.state.smsConsentAt)}</StateRow>
                  <StateRow label='Notifications'>{smsState.state.notificationsEnabled ? 'Active' : 'Paused'}</StateRow>
                  <StateRow label='Subscribed events'>{smsState.state.subscribedEvents.length ? smsState.state.subscribedEvents.join(', ') : 'None'}</StateRow>
                  <StateRow label='Current facility'>{smsState.state.currentFacilityName ?? '—'}</StateRow>
                  <StateRow label='Welcomed'>{fmtDate(smsState.state.smsWelcomedAt)}</StateRow>
                  <StateRow label='Opted out (internal DB)'>{fmtDate(smsState.state.smsOptedOutAt)}</StateRow>
                  <AwsOptOutRows awsOptOut={smsState.awsOptOut} dbOptedOut={!!smsState.state.smsOptedOutAt} />
                  {(smsState.state.smsOptedOutAt || smsState.awsOptOut.optedOut) && (
                    <Group>
                      <Button size='xs' variant='light' color='red' onClick={() => setOverrideOpen(true)} loading={overrideMutation.isPending}>
                        Override SMS Opt-out
                      </Button>
                    </Group>
                  )}
                  {overrideResult === 'blocked_30_day' && (
                    <Alert color='yellow' variant='light' radius='lg' icon={<IconAlertCircle />} title='Opt-out override failed'>
                      AWS refused our request to remove this number from the opt-out list. A phone number's opt-out may be reset only once every
                      ~30 days. The user can try enrolling a different number, or wait until the 30-day window elapses.
                    </Alert>
                  )}
                  {overrideResult === 'error' && (
                    <Alert color='red' variant='light' radius='lg' icon={<IconAlertCircle />} title='Opt-out override failed'>
                      Something went wrong reaching AWS. Please try again.
                    </Alert>
                  )}
                </Stack>

                <GateSection gate={smsState.gate} />

                <Divider color='gray.2' />
                <Stack gap='xs'>
                  <Title order={4}>Verification (OTP)</Title>
                  <StateRow label='Last code sent'>{fmtDate(smsState.otp.lastSentAt)}</StateRow>
                  <StateRow label='Attempts'>{smsState.otp.attempts}</StateRow>
                  <StateRow label='Code expires'>{fmtDate(smsState.otp.expiresAt)}</StateRow>
                </Stack>

                <Divider color='gray.2' />
                <Stack gap='xs'>
                  <Title order={4}>Opt-out history</Title>
                  <OptHistory optHistory={smsState.optHistory} />
                </Stack>

                <Modal opened={overrideOpen} onClose={() => setOverrideOpen(false)} title='Override SMS opt-out' centered>
                  <Stack>
                    <Text size='sm'>
                      This clears the opt-out record for{' '}
                      <Text span fw={600}>{smsState.state.phoneNumber}</Text> at AWS and in our record, so the user
                      will start receiving texts again.
                    </Text>
                    <Alert color='yellow' variant='light' radius='lg'>
                      Only do this if the user has <strong>asked to resume</strong> notifications. Re-enabling
                      messages without the user's consent may violate TCPA.
                    </Alert>
                    <Group justify='flex-end'>
                      <Button variant='default' onClick={() => setOverrideOpen(false)}>Cancel</Button>
                      <Button color='red' loading={overrideMutation.isPending} onClick={() => overrideMutation.mutate()}>
                        Override SMS Opt-out
                      </Button>
                    </Group>
                  </Stack>
                </Modal>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

export default AdminUserSupportPage;
