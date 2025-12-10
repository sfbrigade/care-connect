import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';

function DIDOMobileNavbar ({ close }) {
  const { user } = useAuthContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/dido/' onClick={close} label='Home' />

      {user && (
        <>
          {user.isAdmin && (
            <>
              <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
              <MantineNavLink component={NavLink} to='/admin/invites' onClick={close} label='Invites' />
              <MantineNavLink component={NavLink} to='/admin/users' onClick={close} label='Users' />
            </>
          )}
          <Divider />
          <MantineNavLink component={NavLink} to='/account' onClick={close} label='Account' />
        </>
      )}

      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}
    </Stack>
  );
}

export default DIDOMobileNavbar;
