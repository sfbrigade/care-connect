import { useEffect, useState } from 'react';
import { Alert, Button, Container, Group, Loader, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconBellOff } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import NotificationPreferenceToggles from '@/components/NotificationPreferenceToggles';
import ScreenHeading from '@/components/ScreenHeading';
import { useToast } from '@/components/ToastContext';

function NotificationSettingsPage () {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const facilityName = facility?.name ?? 'RESET';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Initialize once from the loaded user; don't re-sync on every refetch so
  // in-progress edits aren't clobbered.
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (user && selected === null) {
      setSelected(new Set(user.subscribedEvents ?? []));
    }
  }, [user, selected]);

  const saveMutation = useMutation({
    mutationFn: (subscribedEvents) => Api.users.update(user.id, { subscribedEvents }),
    onSuccess: (response) => {
      queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast('Notification preferences updated', 'success');
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

  function onSave () {
    saveMutation.mutate([...selected]);
  }

  const isLoading = selected === null;
  const noneSelected = !isLoading && selected.size === 0;

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
          <ScreenHeading label='Set your preferences' message='Choose the types of notifications you’d like to receive.' />

          {!isLoading && user?.phoneVerifiedAt && !user?.notificationsEnabled && (
            <Alert icon={<IconBellOff size={18} />} color='gray' variant='light'>
              SMS notifications are muted. Unmute from the SMS menu in the header to start receiving them.
            </Alert>
          )}

          {isLoading
            ? (
              <Group justify='center' py='xl'><Loader /></Group>
              )
            : (
              <NotificationPreferenceToggles selected={selected} onToggle={toggle} facilityName={facilityName} />
              )}

          <Group>
            <Button variant='light' color='red' onClick={() => navigate('/profile')}>Cancel</Button>
            <Button
              variant='secondary'
              onClick={onSave}
              disabled={isLoading || noneSelected}
              loading={saveMutation.isPending}
            >
              Save preferences
            </Button>
          </Group>
          {noneSelected && (
            <Text size='sm' c='dimmed'>Select at least one notification type to save.</Text>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default NotificationSettingsPage;
