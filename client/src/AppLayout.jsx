import { useEffect } from 'react';
import { AppShell, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { matchPath, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import Header from './Header';

import Api from './Api';
import AppRoutes from './AppRoutes';
import EnvironmentBanner, {
  ENVIRONMENT_BANNER_HEIGHT,
  shouldShowEnvironmentBanner,
} from './components/EnvironmentBanner';
import { useFacilityContext } from './FacilityContext';
import { useStaticContext } from './StaticContext';

const HEADER_HEIGHT = 80;

function AppLayout () {
  const [opened, { close, toggle }] = useDisclosure();
  const navigate = useNavigate();
  const { facility, setFacility } = useFacilityContext();
  const { env } = useStaticContext();
  const queryClient = useQueryClient();

  async function logout (event) {
    event.preventDefault();
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
  const showHeader = !isHeaderHidden;
  const showBanner = shouldShowEnvironmentBanner(env);
  // Banner lives inside AppShell.Header so Mantine's sticky/positioning math
  // accounts for it (otherwise the header overlays the banner on mobile).
  // Header height stretches to fit both when both are visible.
  const totalHeaderHeight =
    (showBanner ? ENVIRONMENT_BANNER_HEIGHT : 0) + (showHeader ? HEADER_HEIGHT : 0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <AppShell
      header={{ height: totalHeaderHeight }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
      padding='sm'
      bg={showHeader && facility ? 'gray.0' : 'white'}
    >
      {totalHeaderHeight > 0 && (
        <AppShell.Header
          bg={facility ? 'gray.0' : 'white'}
          withBorder={showHeader && !facility}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {showBanner && <EnvironmentBanner />}
          {showHeader && (
            <Box style={{ flex: 1, minHeight: 0 }}>
              <Header opened={opened} close={close} toggle={toggle} logout={logout} />
            </Box>
          )}
        </AppShell.Header>
      )}
      <AppShell.Main px={0}>
        <AppRoutes />
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
