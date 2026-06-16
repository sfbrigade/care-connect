import { useEffect } from 'react';
import { AppShell, Button, CloseButton, Group, Paper, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { matchPath, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { IconBell } from '@tabler/icons-react';

import Header from './Header';

import Api from './Api';
import AppRoutes from './AppRoutes';
import { useFacilityContext } from './FacilityContext';
import { useAuthContext } from './AuthContext';
import { usePushNotifications } from './hooks/usePushNotifications';

function PushPromptBanner ({ onAllow, onDismiss }) {
  return (
    <Paper shadow='sm' p='md' withBorder style={{ position: 'sticky', top: 0, zIndex: 200 }}>
      <Group justify='space-between' wrap='nowrap'>
        <Group gap='sm' wrap='nowrap'>
          <IconBell size={28} />
          <Text size='sm'>Enable notifications to get alerts for hold cancellations and facility updates.</Text>
        </Group>
        <Group gap='sm' wrap='nowrap'>
          <Button size='sm' onClick={onAllow}>Allow</Button>
          <CloseButton size='lg' onClick={onDismiss} aria-label='Dismiss notification prompt' />
        </Group>
      </Group>
    </Paper>
  );
}

function AppLayout () {
  const [opened, { close, toggle }] = useDisclosure();
  const navigate = useNavigate();
  const { facility, setFacility } = useFacilityContext();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const { promptVisible, requestPermission, dismissPrompt, unsubscribe } = usePushNotifications(user);

  async function logout (event) {
    event.preventDefault();
    await unsubscribe();
    await Api.auth.logout();
    queryClient.setQueryData(['users', 'me'], null);
    close();
    navigate('/');
    if (import.meta.env.DEV) {
      setFacility(null);
      window?.location.reload();
    }
  }

  const location = useLocation();
  const isHeaderHidden = [
    '/login',
    '/units',
    '/passwords/*',
    '/invites/*',
    '/register',
  ].some(path => matchPath(path, location.pathname));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <AppShell
      header={{ height: 80 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
      padding='sm'
      bg={!isHeaderHidden && facility ? 'gray.0' : 'white'}
    >
      {!isHeaderHidden && (
        <AppShell.Header bg={facility ? 'gray.0' : 'white'} withBorder={!facility}>
          <Header opened={opened} close={close} toggle={toggle} logout={logout} />
        </AppShell.Header>
      )}
      <AppShell.Main px={0}>
        {promptVisible && !isHeaderHidden && (
          <PushPromptBanner onAllow={requestPermission} onDismiss={dismissPrompt} />
        )}
        <AppRoutes />
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
