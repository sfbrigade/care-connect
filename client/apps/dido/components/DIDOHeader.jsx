import { useEffect } from 'react';
import { useNavigate, Link, NavLink, useLocation } from 'react-router';
import { StatusCodes } from 'http-status-codes';
import { ActionIcon, Anchor, Container, Group, Menu, Title } from '@mantine/core';
import { IconMessages } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import Api from '../../../core/Api';
import { useAuthContext } from '../../../core/AuthContext';

function DIDOHeader ({ opened, close, toggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuthContext();

  // DIDO doesn't require login, but we still check for admin users
  const { data, isSuccess } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => Api.users.me().then((response) => response.status === StatusCodes.OK ? response.data : null),
    retry: false, // Don't retry if not logged in
  });

  useEffect(
    function () {
      if (isSuccess && data) {
        setUser(data);
      }
    },
    [data, isSuccess, setUser]
  );

  const isFeedbackPage = location.pathname === '/feedback';

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
        <Link to='/dido/' onClick={close}>
          <Title size='xl'>DIDO</Title>
        </Link>
        <Group visibleFrom='sm' gap='xl'>
          <Anchor component={NavLink} to='/dido/' onClick={close}>
            Home
          </Anchor>
          {user?.isAdmin && (
            <>
              <Anchor component={NavLink} to='/admin/facilities' onClick={close}>
                Facilities
              </Anchor>
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
            </>
          )}
        </Group>
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
        </Group>
      </Group>
    </Container>
  );
}

export default DIDOHeader;

