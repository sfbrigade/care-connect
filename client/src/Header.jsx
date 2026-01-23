import { Link, NavLink } from 'react-router';
import { Anchor, Avatar, Burger, Box, Container, Group, Menu, Text, Title } from '@mantine/core';
// import { IconMessages } from '@tabler/icons-react';
import {
  IconMessages,
  IconSettings,
  IconSearch,
  IconPhoto,
  IconMessageCircle,
  IconTrash,
  IconArrowsLeftRight,
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
              {/* <Button>Toggle menu</Button> */}
                <Burger opened={opened} onClick={toggle} />
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Application</Menu.Label>
              <Menu.Item leftSection={<IconSettings size={14} />}>
                Settings
              </Menu.Item>
              <Menu.Item leftSection={<IconMessageCircle size={14} />}>
                Messages
              </Menu.Item>
              <Menu.Item leftSection={<IconPhoto size={14} />}>
                Gallery
              </Menu.Item>
              <Menu.Item
                leftSection={<IconSearch size={14} />}
                rightSection={
                  <Text size="xs" c="dimmed">
                    ⌘K
                  </Text>
                }
              >
                Search
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Danger zone</Menu.Label>
              <Menu.Item
                leftSection={<IconArrowsLeftRight size={14} />}
              >
                Transfer my data
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
              >
                Delete my account
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
