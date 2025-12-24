import { Link, NavLink } from 'react-router';
import { Anchor, Avatar, Burger, Container, Group, Menu, Title } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';
import { useLocationContext } from '@/LocationContext';

function Header ({ opened, close, toggle, logout }) {
  const { location } = useLocationContext();
  const { user } = useAuthContext();

  return (
    <Container h='100%'>
      <Group h='100%' align='center' justify='space-between'>
        <Link to='/' onClick={close}>
          <Title size='xl'>{location?.name || 'CareConnectSF'}</Title>
        </Link>
        <Group visibleFrom='sm' gap='xl'>
          <Anchor component={NavLink} aria-current='page' to='/' onClick={close}>
            Home
          </Anchor>
          {user?.isAdmin && (
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
          {user && (
            <>
              {location.appType === 'lesc' && (
                <>
                  <Anchor component={NavLink} to='/holds' onClick={close}>
                    Holds
                  </Anchor>
                  <Anchor component={NavLink} to='/history' onClick={close}>
                    History
                  </Anchor>
                </>
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
              <Anchor href='/logout' onClick={logout}>
                Log out
              </Anchor>
            </>
          )}
        </Group>
        <Burger opened={opened} onClick={toggle} hiddenFrom='sm' size='sm' />
      </Group>
    </Container>
  );
}

export default Header;
