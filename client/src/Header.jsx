import { Link, NavLink } from 'react-router';
import { ActionIcon, Anchor, Avatar, Burger, Container, Group, Menu, Title } from '@mantine/core';
import { IconMessages } from '@tabler/icons-react';

import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';

function Header ({ opened, close, toggle, logout }) {
  const { facility } = useFacilityContext();
  const { user } = useAuthContext();

  return (
    <Container h='100%'>
      <Group h='100%' align='center' justify='space-between'>
        <Link to='/' onClick={close}>
          <Title size='xl'>{facility?.name || 'CareConnectSF'}</Title>
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
              {facility?.type === 'LESC' && (
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
          {!user && (
            <Anchor component={NavLink} to='/login' onClick={close}>
              Log in
            </Anchor>
          )}
          <Link to='/feedback'>
            <ActionIcon
              variant='subtle'
              size='lg'
              aria-label='Feedback'
            >
              <IconMessages size={22} stroke={1.5} color='var(--mantine-color-gray-7)' />
            </ActionIcon>
          </Link>
        </Group>
        <Group hiddenFrom='sm' size='sm'>
          <Link to='/feedback'>
            <ActionIcon
              variant='subtle'
              size='lg'
              aria-label='Feedback'
            >
              <IconMessages size={22} stroke={1.5} color='var(--mantine-color-gray-7)' />
            </ActionIcon>
          </Link>
          {user && <Burger opened={opened} onClick={toggle} />}
        </Group>
      </Group>
    </Container>
  );
}

export default Header;
