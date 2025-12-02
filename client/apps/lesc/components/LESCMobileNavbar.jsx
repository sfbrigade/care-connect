import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack } from '@mantine/core';

import { useAuthContext } from '../../../core/AuthContext';

function LESCMobileNavbar ({ close }) {
  const { user } = useAuthContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/lesc/holds' onClick={close} label='Holds' />
      <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
      
      {user && (
        <>
          <Divider />
          <MantineNavLink component={NavLink} to='/account' onClick={close} label='Account' />
          {user.isAdmin && (
            <>
              <MantineNavLink component={NavLink} to='/admin/invites' onClick={close} label='Invites' />
              <MantineNavLink component={NavLink} to='/admin/users' onClick={close} label='Users' />
            </>
          )}
        </>
      )}

      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}
    </Stack>
  );
}

export default LESCMobileNavbar;

