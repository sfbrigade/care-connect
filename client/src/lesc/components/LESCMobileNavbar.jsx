import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';

function LESCMobileNavbar ({ close }) {
  const { user } = useAuthContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/lesc/holds' onClick={close} label='Holds' />
      <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
      <MantineNavLink component={NavLink} to='/lesc/checkin' onClick={close} label='Check-in' />
      <MantineNavLink component={NavLink} to='/lesc/client' onClick={close} label='Clients' />
      <MantineNavLink component={NavLink} to='/lesc/incident' onClick={close} label='Incidents' />
      <Divider />
      {user && (
        <MantineNavLink
          component={NavLink}
          to='/account'
          onClick={close}
          label={user.email ? `Account (${user.email})` : 'Account'}
        />
      )}
      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}
    </Stack>
  );
}

export default LESCMobileNavbar;
