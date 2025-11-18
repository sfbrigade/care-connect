import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack, Text } from '@mantine/core';

import { useAuthContext } from './AuthContext';

function MobileNavbar ({ close }) {
  const { user } = useAuthContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/' onClick={close} label='Home' />
      <MantineNavLink component={NavLink} to='/lesc' onClick={close} label='LESC' />
      {user && user.isAdmin && (
        <>
          <Divider />
          <Text size='sm' fw={500} c='dimmed'>Admin</Text>
          <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
          <MantineNavLink component={NavLink} to='/admin/users' onClick={close} label='Users' />
          <MantineNavLink component={NavLink} to='/admin/invites' onClick={close} label='Invites' />
        </>
      )}
      {user && (
        <>
          <Divider />
          <MantineNavLink component={NavLink} to='/account' onClick={close} label='Account' />
        </>
      )}
      <Divider />
      <Stack gap={2}>
        <Text size='sm'>version: 1.0.2</Text>
        <Text size='sm'>support: careconnect@sfgov.org</Text>
      </Stack>
    </Stack>
  );
}

export default MobileNavbar;
