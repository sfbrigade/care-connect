import { useEffect, useRef, useState } from 'react';
import { Button, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import NotificationPreferenceToggles, { isSmsSubscribed } from '@/components/NotificationPreferenceToggles';
import { useToast } from '@/components/ToastContext';

// "Notification settings" page (reached from Profile → Edit under SMS
// notifications). Two states: no verified number → an empty state prompting the
// user to add one; verified number → the per-event toggles. Changes apply
// immediately on toggle — there's no Save; the user just goes Back when done. (The
// enroll/subscribe wizard keeps its own deliberate "Subscribe" commit; auto-apply
// is only for this standalone page.)
function NotificationSettingsPage () {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const facilityName = facility?.name ?? 'RESET';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const hasNumber = !!user?.phoneVerifiedAt;
  const subscribed = isSmsSubscribed(user);

  // Initialize once from the loaded user; don't re-sync on every refetch.
  const [selected, setSelected] = useState(null);
  const lastSavedRef = useRef([]);
  useEffect(() => {
    if (user && selected === null) {
      setSelected(new Set(user.subscribedEvents ?? []));
      lastSavedRef.current = user.subscribedEvents ?? [];
    }
  }, [user, selected]);

  // Auto-apply: each toggle persists the full subscribedEvents set immediately.
  // Saves are serialized (at most one PATCH in flight; a mid-flight change coalesces
  // into a single trailing save) so rapid toggling can't land out of order — every
  // request carries the complete set, so the last one reconciles server to UI.
  const savingRef = useRef(false);
  const pendingRef = useRef(null);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  function buildData (events) {
    const data = { subscribedEvents: events };
    // Enabling from a not-yet-subscribed state also unmutes (mirrors Subscribe).
    const cached = queryClient.getQueryData(['users', 'me']) ?? user;
    if (cached && !isSmsSubscribed(cached) && events.length > 0) data.notificationsEnabled = true;
    return data;
  }

  function persist (events) {
    if (savingRef.current) {
      pendingRef.current = events;
      return;
    }
    savingRef.current = true;
    Api.users.update(userIdRef.current, buildData(events))
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

  // Flush a pending trailing save on unmount so a last-moment toggle isn't lost if
  // the user hits Back immediately after a rapid change.
  useEffect(() => () => {
    if (pendingRef.current === null) return;
    const events = pendingRef.current;
    pendingRef.current = null;
    const cached = queryClient.getQueryData(['users', 'me']);
    const data = { subscribedEvents: events };
    if (cached && !isSmsSubscribed(cached) && events.length > 0) data.notificationsEnabled = true;
    Api.users.update(userIdRef.current, data).catch(() => {});
  }, [queryClient]);

  function toggle (value) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
    persist([...next]);
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
                <Group justify='space-between'>
                  <Text fw={500}>SMS subscription</Text>
                  <Text>{subscribed ? 'On' : 'Off'}</Text>
                </Group>
                <Text size='sm' c='dimmed'>Receive live updates on a person’s status.</Text>
              </div>
              <NotificationPreferenceToggles selected={selected} onToggle={toggle} facilityName={facilityName} />
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default NotificationSettingsPage;
