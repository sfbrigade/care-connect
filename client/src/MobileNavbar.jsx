import { useState } from 'react';
import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Stack, Collapse } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

<<<<<<< HEAD
import { useAuthContext } from './AuthContext';
=======
import { useAuthContext } from '../core/AuthContext';
>>>>>>> origin/multiapp

function MobileNavbar ({ close }) {
  const { user } = useAuthContext();
  const [lescOpened, setLescOpened] = useState(false);

  return (
    <Stack gap='md'>
      <MantineNavLink component={NavLink} to='/' onClick={close} label='Home' />

      {/* LESC with submenu */}
      <MantineNavLink
        label='LESC'
        leftSection={lescOpened ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        onClick={() => setLescOpened((o) => !o)}
      />
      <Collapse in={lescOpened}>
        <Stack gap={0} pl='md'>
          <MantineNavLink component={NavLink} to='/lesc/holds' onClick={close} label='Hold' />
          <MantineNavLink component={NavLink} to='/admin/facilities' onClick={close} label='Facilities' />
        </Stack>
      </Collapse>

      {!user && (
        <MantineNavLink component={NavLink} to='/login' onClick={close} label='Login' />
      )}

      {user && (
        <>
          <Divider />
          <MantineNavLink component={NavLink} to='/account' onClick={close} label='Account' />
        </>
      )}
    </Stack>
  );
}

export default MobileNavbar;
