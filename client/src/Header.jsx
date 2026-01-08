import { Link, NavLink } from 'react-router';
import { Anchor, Avatar, Burger, Container, Group, Menu, Title } from '@mantine/core';
import { IconMessages } from '@tabler/icons-react';

import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import IconButtonLink from '@/components/IconButtonLink';

function Header ({ opened, close, toggle, logout }) {
  const { facility } = useFacilityContext();
  const { user } = useAuthContext();

  return (
    <Container h='100%' size='xl'>
      <Group h='100%' align='center' justify='space-between'>
        <Link to='/' onClick={close}>
          <Title order={3} c='black'>{facility ? `${user?.rank ?? ''} ${user?.firstName} ${user?.lastName}`.trim() : 'CareConnectSF'}</Title>
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
                <Menu.Item><Anchor component={NavLink} to='/admin/facilities'>Facilities</Anchor></Menu.Item>
                <Menu.Item><Anchor component={NavLink} to='/admin/invites'>Invites</Anchor></Menu.Item>
                <Menu.Item><Anchor component={NavLink} to='/admin/organizations'>Organizations</Anchor></Menu.Item>
                <Menu.Item><Anchor component={NavLink} to='/admin/users'>Users</Anchor></Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
          {user && (
            <>
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
          <IconButtonLink icon={IconMessages} to='/feedback' />
        </Group>
        <Group hiddenFrom='sm' size='sm'>
          <IconButtonLink icon={IconMessages} to='/feedback' />
          {user && <Burger opened={opened} onClick={toggle} />}
        </Group>
      </Group>
    </Container>
  );
}

export default Header;
