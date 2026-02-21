import { Link, NavLink } from 'react-router';
import { Anchor, Avatar, Burger, Box, Container, Group, Menu, Text, Title } from '@mantine/core';
import {
  IconBug,
  IconHome,
  IconClipboardList,
  IconMessages,
  IconLogout
} from '@tabler/icons-react';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import IconButtonLink from '@/components/IconButtonLink';

function Header ({ opened, close, toggle, logout }) {
  const { facility } = useFacilityContext();
  const { user } = useAuthContext();

  return (
    <Container h='100%' size='xl'>
      <Group h='100%' align='center' justify='space-between' wrap='nowrap'>
        <Link to='/' onClick={close} style={{ minWidth: 0 }}>
          <Box>
            <Title order={3} c='black' truncate>{facility ? `${user?.rank ?? ''} ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : 'CareConnectSF'}</Title>
            {user?.unit && <Text size='sm' color='dimmed' truncate>{user.unit.name}</Text>}
          </Box>
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
                <Menu.Item><Anchor component={NavLink} to='/admin/enums'>Enums</Anchor></Menu.Item>
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
        <Group hiddenFrom='sm' size='sm' wrap='nowrap' style={{ flexShrink: 0 }}>
          <IconButtonLink icon={IconMessages} to='/feedback' />
          {user &&
            <Menu position='bottom-end' width={280} onDismiss={close}>
              <Menu.Target>
                <Burger opened={opened} onClick={toggle} />
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconHome size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/'
                  label='Home'
                  onClick={close}
                >
                  Home
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconClipboardList size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/profile'
                  onClick={close}
                >
                  Profile
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconBug size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='#'
                  onClick={close}
                >
                  Report a bug
                </Menu.Item>
                <Menu.Item
                  color='red'
                  leftSection={<IconLogout size={20} />}
                  to='/logout'
                  onClick={logout}
                >
                  Logout
                </Menu.Item>
                <Menu.Item>
                  <Text c='gray.5' size='xs'>
                    Version 1.0
                  </Text>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>}
        </Group>
      </Group>
    </Container>
  );
}

export default Header;
