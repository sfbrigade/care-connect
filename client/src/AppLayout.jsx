import { useEffect } from 'react';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { matchPath, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import Header from './Header';
import Navbar from './Navbar';

import Api from './Api';
import AppRoutes from './AppRoutes';
import { useFacilityContext } from './FacilityContext';

function AppLayout () {
  const [opened, { close, toggle }] = useDisclosure();
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();

  async function logout (event) {
    event.preventDefault();
    await Api.auth.logout();
    queryClient.setQueryData(['users', 'me'], null);
    close();
    navigate('/');
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
      padding='md'
      bg={!isHeaderHidden && facility ? 'gray.0' : 'white'}
    >
      {!isHeaderHidden && (
        <AppShell.Header bg={facility ? 'gray.0' : 'white'} withBorder={!facility}>
          <Header opened={opened} close={close} toggle={toggle} logout={logout} />
        </AppShell.Header>
      )}
      {/* <AppShell.Navbar>
        <Navbar close={close} logout={logout} />
      </AppShell.Navbar> */}
      <AppShell.Main px={0}>
        <AppRoutes />
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
