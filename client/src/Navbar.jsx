import { NavLink } from 'react-router';
import { Menu, Button, Text, Divider, NavLink as MantineNavLink, Stack } from '@mantine/core';
import {
  IconSettings,
  IconSearch,
  IconPhoto,
  IconMessageCircle,
  IconTrash,
  IconArrowsLeftRight,
} from '@tabler/icons-react';
import { useAuthContext } from '@/AuthContext';

function Navbar ({ close, logout }) {
  const { user } = useAuthContext();

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/' onClick={close} label='Home' />
      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}
      {user && (
        <>
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
