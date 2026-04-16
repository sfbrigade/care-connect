import { Link } from 'react-router';
import { Burger, Box, Container, Group, Menu, Text, Title } from '@mantine/core';
import {
  IconSend,
  IconHome,
  IconAddressBook,
  IconLogout,
  IconUser
} from '@tabler/icons-react';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import { useUserRole } from '@/hooks/useUserRole';

function Header ({ opened, close, toggle, logout }) {
  const { facility } = useFacilityContext();
  const { user } = useAuthContext();
  const { isOrgAdmin } = useUserRole();

  return (
    <Container h='100%'>
      <Group h='100%' align='center' justify='space-between' wrap='nowrap'>
        <Link to='/' onClick={close} style={{ minWidth: 0 }}>
          <Box>
            <Title order={3} c='black' truncate>{facility ? `${user?.rank ?? ''} ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : 'CareConnectSF'}</Title>
            {user?.unit && <Text size='sm' color='dimmed' truncate>{user.unit.name}</Text>}
          </Box>
        </Link>
        <Group wrap='nowrap' style={{ flexShrink: 0 }}>
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
                {isOrgAdmin && (
                  <Menu.Item
                    leftSection={<IconAddressBook size={20} color='var(--mantine-color-gray-5)' />}
                    component={Link}
                    to='/manage-users'
                    onClick={close}
                  >
                    Manage users
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconUser size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/profile'
                  onClick={close}
                >
                  Profile
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSend size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/feedback'
                  onClick={close}
                >
                  Share feedback
                </Menu.Item>
                {user?.isAdmin && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Admin</Menu.Label>
                    <Menu.Item component={Link} to='/admin/enums' onClick={close}>Enums</Menu.Item>
                    <Menu.Item component={Link} to='/admin/facilities' onClick={close}>Facilities</Menu.Item>
                    <Menu.Item component={Link} to='/admin/invites' onClick={close}>Invites</Menu.Item>
                    <Menu.Item component={Link} to='/admin/organizations' onClick={close}>Organizations</Menu.Item>
                    <Menu.Item component={Link} to='/admin/users' onClick={close}>Users</Menu.Item>
                    <Menu.Divider />
                  </>
                )}
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
