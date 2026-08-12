import { useEffect, useRef, useState } from 'react';
import { Button, Container, Group, Loader, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconBellRinging, IconBellOff, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import NotificationPreferenceToggles from '@/components/NotificationPreferenceToggles';
import SmsOptOutBanner from '@/components/SmsOptOutBanner';
import { useToast } from '@/components/ToastContext';

// "Notification settings" page (reached from Profile → SMS Notifications → Edit
// No save/cancel; edits applied immediately
function NotificationSettingsPage () {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const facilityName = facility?.name ?? 'RESET';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const hasNumber = !!user?.phoneVerifiedAt;

  // Initialize once from the loaded user; don't re-sync on every refetch.
  const [selected, setSelected] = useState(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const lastSavedRef = useRef([]);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  useEffect(() => {
    if (user && selected === null) {
      setSelected(new Set(user.subscribedEvents ?? []));
      setNotifEnabled(!!user.notificationsEnabled);
      lastSavedRef.current = user.subscribedEvents ?? [];
    }
  }, [user, selected]);

  // Auto-apply (event toggles): each toggle persists the full subscribedEvents set
  // immediately. Saves are serialized (at most one PATCH in flight; a mid-flight
  // change coalesces into a single trailing save) so rapid toggling can't land out
  // of order — every request carries the complete set, so the last one wins.
  const savingRef = useRef(false);
  const pendingRef = useRef(null);

  function persist (events) {
    if (savingRef.current) {
      pendingRef.current = events;
      return;
    }
    savingRef.current = true;
    Api.users.update(userIdRef.current, { subscribedEvents: events })
      .then((response) => {
        lastSavedRef.current = events;
        queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
      })
      .catch(() => {
        pendingRef.current = null;
        setSelected(new Set(lastSavedRef.current)); // revert the optimistic toggle
        showToast('Couldn’t save your preferences', 'error', 4000, 'Please try again.');
      })
      .finally(() => {
        savingRef.current = false;
        if (pendingRef.current !== null) {
          const next = pendingRef.current;
          pendingRef.current = null;
          persist(next);
        }
      });
  }

  // Flush a pending trailing save on unmount so a last-moment toggle isn't lost.
  useEffect(() => () => {
    if (pendingRef.current === null) return;
    const events = pendingRef.current;
    pendingRef.current = null;
    Api.users.update(userIdRef.current, { subscribedEvents: events }).catch(() => {});
  }, []);

  function toggle (value) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
    persist([...next]);
  }

  function handleMuteChange (value) {
    const enabled = value === 'unmute';
    const prev = notifEnabled;
    setNotifEnabled(enabled);
    Api.users.update(userIdRef.current, { notificationsEnabled: enabled })
      .then((response) => queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data })))
      .catch(() => {
        setNotifEnabled(prev);
        showToast('Couldn’t update notifications', 'error', 4000, 'Please try again.');
      });
  }

  const isLoading = selected === null;

  return (
    <>
      <Head>
        <title>SMS notifications</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/profile' aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Title order={2}>SMS notifications</Title>

          {/* Self-gates: shows only when the user is carrier-opted-out (replied STOP). */}
          <SmsOptOutBanner />

          {isLoading && <Group justify='center' py='xl'><Loader /></Group>}

          {!isLoading && !hasNumber && (
            <Stack align='center' gap='xs' mt='xl'>
              <Text ta='center' size='lg'>No phone number on file.</Text>
              <Text ta='center' size='sm' c='dimmed'>
                Add a phone number to start receiving live text updates on a person’s status.
              </Text>
              <Button mt='md' onClick={() => navigate('/profile/notifications/enroll')}>
                Add phone number
              </Button>
            </Stack>
          )}

          {!isLoading && hasNumber && (
            <>
              <div>
                <Text fw={500} size='lg'>Status</Text>
                <Text size='sm' c='dimmed'>Temporarily pause live text updates without losing your saved preferences.</Text>
              </div>
              <Select
                value={notifEnabled ? 'unmute' : 'mute'}
                onChange={(value) => { if (value) handleMuteChange(value); }}
                data={[{ value: 'unmute', label: 'Active' }, { value: 'mute', label: 'Paused' }]}
                allowDeselect={false}
                leftSection={notifEnabled
                  ? <IconBellRinging size={20} color='var(--mantine-color-text)' />
                  : <IconBellOff size={20} color='var(--mantine-color-text)' />}
                renderOption={({ option, checked }) => (
                  <Group flex={1} gap='sm' justify='space-between' wrap='nowrap'>
                    <Group gap='sm' wrap='nowrap'>
                      {option.value === 'unmute' ? <IconBellRinging size={20} /> : <IconBellOff size={20} />}
                      <span>{option.label}</span>
                    </Group>
                    {checked && <IconCheck size={18} color='var(--mantine-color-indigo-6)' />}
                  </Group>
                )}
              />
              <NotificationPreferenceToggles selected={selected} onToggle={toggle} facilityName={facilityName} />
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default NotificationSettingsPage;
