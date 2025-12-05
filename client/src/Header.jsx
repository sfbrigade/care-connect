import { useEffect, useMemo } from 'react';
import { useNavigate, Link, NavLink, useLocation, useSearchParams } from 'react-router';
import { StatusCodes } from 'http-status-codes';
import { ActionIcon, Anchor, Avatar, Container, Group, Menu, Title } from '@mantine/core';
import { IconMenu2, IconMessages } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '../core/Api';
import { useAuthContext } from '../core/AuthContext';
import { useStaticContext } from '../core/StaticContext';
import { getLocation } from '../core/utils/location';

function Header ({ opened, close, toggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const staticContext = useStaticContext();
  const { user, setUser } = useAuthContext();
  const queryClient = useQueryClient();

  // Determine which app we're in based on location or from parameter
  const appName = useMemo(() => {
    // Check if we're on a login page and have a 'from' parameter
    if (location.pathname === '/login') {
      const from = location.state?.from || searchParams.get('from') || '/';
      const fromPath = typeof from === 'string' ? from : (typeof from === 'object' && from.pathname ? from.pathname : '/');
      if (fromPath.startsWith('/lesc')) return 'LESC';
      if (fromPath.startsWith('/dido')) return 'DIDO';
    }
    // Check current pathname
    if (location.pathname.startsWith('/lesc')) return 'LESC';
    if (location.pathname.startsWith('/dido')) return 'DIDO';
    // Fallback to location detection
    const appLocation = getLocation(staticContext);
    return appLocation?.location || null;
  }, [location.pathname, location.state, searchParams, staticContext]);

  const { data, isSuccess } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => Api.users.me().then((response) => response.status === StatusCodes.OK ? response.data : null),
  });

  useEffect(
    function () {
      if (isSuccess) {
        setUser(data);
      }
    },
    [data, isSuccess, setUser]
  );

  async function onLogout (event) {
    event.preventDefault();
    await Api.auth.logout();
    queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    setUser(null);
    close();
    navigate('/');
  }

  const isFeedbackPage = location.pathname === '/feedback';
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';

  function handleFeedbackToggle () {
    if (isFeedbackPage) {
      navigate(-1); // Go back to the previous page
    } else {
      navigate('/feedback');
    }
    close(); // Close the mobile navbar if open
  }

  return (
    <Container h='100%'>
      <Group h='100%' align='center' justify='space-between'>
        <Link to='/' onClick={close}>
          <Title size='xl'>{appName || 'CareConnectSF'}</Title>
        </Link>
        <Group visibleFrom='sm' gap='xl'>
          <Anchor component={NavLink} aria-current='page' to='/' onClick={close}>
            Home
          </Anchor>
          <Anchor component={NavLink} to='/lesc' onClick={close}>
            LESC
          </Anchor>
          <Anchor component={NavLink} to='/admin/facilities' onClick={close}>
            Facilities
          </Anchor>
          {user && (
            <>
              {user.isAdmin && (
                <Menu trigger='hover' transitionProps={{ exitDuration: 0 }} withinPortal>
                  <Menu.Target>
                    <Anchor component={NavLink} to='/admin'>Admin</Anchor>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item><Anchor component={NavLink} to='/admin/invites'>Invites</Anchor></Menu.Item>
                    <Menu.Item><Anchor component={NavLink} to='/admin/users'>Users</Anchor></Menu.Item>
                    <Menu.Item><Anchor component={NavLink} to='/admin/facilities'>Facilities</Anchor></Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
              <Group gap='xs'>
                <span>
                  Hello,{' '}
                  <Anchor component={NavLink} to='/account' onClick={close}>
                    {user.firstName}!
                  </Anchor>
                </span>
                {user.pictureUrl && <Avatar src={user.pictureUrl} />}
              </Group>
              <Anchor href='/logout' onClick={onLogout}>
                Log out
              </Anchor>
            </>
          )}
        </Group>
        {!isHomePage && !isLoginPage && (
          <Group hiddenFrom='sm' gap='xs'>
            <ActionIcon
              variant='subtle'
              onClick={handleFeedbackToggle}
              size='lg'
              aria-label='Feedback'
              style={{
                backgroundColor: isFeedbackPage ? 'var(--mantine-color-gray-2)' : 'transparent',
              }}
            >
              <IconMessages size={22} stroke={1.5} color='var(--mantine-color-gray-7)' />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              onClick={toggle}
              size='lg'
              aria-label='Menu'
            >
              <IconMenu2 size={22} stroke={1.5} color='var(--mantine-color-gray-7)' />
            </ActionIcon>
          </Group>
        )}
      </Group>
    </Container>
  );
}

export default Header;
