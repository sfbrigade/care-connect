import { useEffect, useState } from 'react';
import { Box, Button, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
// notifications). Two states: no verified number → prompt to add one; verified
// number → the per-event toggles. (The enroll/subscribe wizard has its own
// "Set your preferences" step; this is the standalone settings version.)
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
  useEffect(() => {
    if (user && selected === null) setSelected(new Set(user.subscribedEvents ?? []));
  }, [user, selected]);

  const saveMutation = useMutation({
    mutationFn: (events) => {
      const data = { subscribedEvents: events };
      // Enabling notifications from a not-yet-subscribed state also unmutes, so
      // they actually start receiving (mirrors the enroll flow's Subscribe).
      if (!subscribed && events.length > 0) data.notificationsEnabled = true;
      return Api.users.update(user.id, data);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast('Notification preferences updated', 'success');
      navigate('/profile');
    },
    onError: () => showToast('Couldn’t save your preferences', 'error', 4000, 'Please try again.'),
  });

  function toggle (value) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
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

          <div>
            <Group justify='space-between'>
              <Text fw={500}>SMS subscription</Text>
              <Text>{subscribed ? 'On' : 'Off'}</Text>
            </Group>
            <Text size='sm' c='dimmed'>Receive live updates on a person’s status.</Text>
          </div>

          {isLoading && <Group justify='center' py='xl'><Loader /></Group>}

          {!isLoading && !hasNumber && (
            <Box bg='gray.1' p='md' style={{ borderRadius: 16 }}>
              <Stack gap='sm'>
                <Text size='sm'>Add a mobile number in your Contact Details to turn on SMS subscription.</Text>
                <Button variant='secondary' size='sm' style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/profile/notifications/enroll')}>
                  Add mobile number
                </Button>
              </Stack>
            </Box>
          )}

          {!isLoading && hasNumber && (
            <>
              <NotificationPreferenceToggles selected={selected} onToggle={toggle} facilityName={facilityName} />
              <Group>
                <Button variant='light' color='red' onClick={() => navigate('/profile')}>Cancel</Button>
                <Button
                  variant='secondary'
                  onClick={() => saveMutation.mutate([...selected])}
                  loading={saveMutation.isPending}
                >
                  Save preferences
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default NotificationSettingsPage;
