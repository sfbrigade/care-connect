import { useEffect, useRef, useState } from 'react';
import { Button, Container, Group, Loader, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import NotificationPreferenceToggles from '@/components/NotificationPreferenceToggles';
import { useToast } from '@/components/ToastContext';

// "Notification settings" page (reached from Profile → Edit under SMS
// notifications). No verified number → an empty state prompting the user to add
// one. Verified number → a Mute/Unmute segmented control plus, when unmuted, the
// per-event toggles (hidden while muted, replaced by a "paused" message). Muting
// preserves subscribedEvents. Every change applies immediately — no Save; the user
// just goes Back when done. (The enroll wizard keeps its own "Subscribe" commit.)
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

  // Mute/unmute (notificationsEnabled): a single deliberate control, so a simple
  // optimistic save + revert-on-error is enough (no rapid-fire serialization).
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
        <title>Notification settings</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/profile' aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Title order={2}>Notification settings</Title>

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
                <Text fw={500}>SMS notifications</Text>
                <Text size='sm' c='dimmed'>Temporarily pause live text updates without losing your saved preferences.</Text>
              </div>
              <SegmentedControl
                color='indigo.6'
                value={notifEnabled ? 'unmute' : 'mute'}
                onChange={handleMuteChange}
                data={[{ label: 'Unmute', value: 'unmute' }, { label: 'Mute', value: 'mute' }]}
                style={{ alignSelf: 'flex-start' }}
                // Match Figma label type (16px / 400 / 24px) while keeping the lg pill shape.
                styles={{ label: { fontSize: 16, fontWeight: 400, lineHeight: '24px' } }}
              />
              {notifEnabled
                ? <NotificationPreferenceToggles selected={selected} onToggle={toggle} facilityName={facilityName} />
                : <Text size='sm' c='dimmed'>SMS notifications are paused. Unmute to start receiving live text updates again.</Text>}
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default NotificationSettingsPage;
