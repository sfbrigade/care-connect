import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';

function Navbar ({ close, logout }) {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/' onClick={close} label='Home' />
      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}
      {user && (
        <>
          {facility?.type === 'LESC' && (
            <>
              <MantineNavLink component={NavLink} to='/checkin' onClick={close} label='Check-in' />
              <MantineNavLink component={NavLink} to='/client' onClick={close} label='Clients' />
              <MantineNavLink component={NavLink} to='/incident' onClick={close} label='Incidents' />
            </>
          )}
          {user?.isAdmin && (
            <>
              <Divider />
              <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
              <MantineNavLink component={NavLink} to='/admin/facility-status-reasons' onClick={close} label='Facility Status Reasons' />
              <MantineNavLink component={NavLink} to='/admin/organizations' onClick={close} label='Organizations' />
              <MantineNavLink component={NavLink} to='/admin/invites' onClick={close} label='Invites' />
              <MantineNavLink component={NavLink} to='/admin/users' onClick={close} label='Users' />
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
