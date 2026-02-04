import { Link, NavLink } from 'react-router';
import { Anchor, Avatar, Burger, Box, Container, Group, Menu, Text, Title } from '@mantine/core';
import {
  IconHome,
  IconClipboardList,
  IconMessages,
  IconBug,
  IconSettings,
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
      <Group h='100%' align='center' justify='space-between'>
        <Link to='/' onClick={close}>
          <Box>
            <Title order={3} c='black'>{facility ? `${user?.rank ?? ''} ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : 'CareConnectSF'}</Title>
            {user?.unit && <Text size='sm' color='dimmed'>{user.unit.name}</Text>}
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
        <Group hiddenFrom='sm' size='sm'>
          <IconButtonLink icon={IconMessages} to='/feedback' />
          {user &&
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Burger opened={opened} onClick={toggle} />
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconHome size={14} />}
                component={Link}
                to='/'
                label='Home'
                onClick={close}
              >
                Home
              </Menu.Item>
              <Menu.Item leftSection={<IconClipboardList size={14} />} component={Link} to="/profile" onClick={close}>
                Profile
              </Menu.Item>
              <Menu.Item leftSection={<IconBug size={14} />}>
                Report a Bug
              </Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />} component={Link} to="/account" onClick={close}>
                Account Settings
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                to='/logout'
                onClick={logout}
                label='Log out'
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          }
        </Group>
      </Group>
    </Container>
  );
}

export default Header;
