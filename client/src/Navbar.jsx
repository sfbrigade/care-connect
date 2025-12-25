import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';
import { useLocationContext } from '@/LocationContext';

function Navbar ({ close, logout }) {
  const { user } = useAuthContext();
  const { location } = useLocationContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/' onClick={close} label='Home' />
      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}
      {user && (
        <>
          {location.appType === 'lesc' && (
            <>
              <MantineNavLink component={NavLink} to='/holds' onClick={close} label='Holds' />
              <MantineNavLink component={NavLink} to='/checkin' onClick={close} label='Check-in' />
              <MantineNavLink component={NavLink} to='/client' onClick={close} label='Clients' />
              <MantineNavLink component={NavLink} to='/incident' onClick={close} label='Incidents' />
              <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
            </>
          )}
          <Divider />
          <MantineNavLink component={NavLink} to='/account' onClick={close} label='Account' />
          <MantineNavLink component={NavLink} to='/logout' onClick={logout} label='Log out' />
          <Divider />
          <MantineNavLink component={NavLink} to='/feedback' onClick={close} label='Feedback' />
        </>
      )}
    </Stack>
  );
}

export default Navbar;
