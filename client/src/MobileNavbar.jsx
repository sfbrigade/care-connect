import { useState } from 'react';
import { NavLink } from 'react-router';
import { Divider, NavLink as MantineNavLink, Paper, Stack, Text, Collapse } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import { useAuthContext } from './AuthContext';
import FeedbackForm from './Feedback/FeedbackForm';

function MobileNavbar ({ close }) {
  const { user } = useAuthContext();
  const [lescOpened, setLescOpened] = useState(false);

  return (
    <Stack gap='md'>
      <Paper withBorder p='sm' radius='md'>
        <Stack gap='md'>
          <Stack gap={4}>
            <Text size='sm' fw={600}>
              Feedback
            </Text>
            <Paper
              p='md'
              radius={12}
              style={{
                boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #dee2e6',
              }}
            >
              <FeedbackForm />
            </Paper>
          </Stack>
          <Text size='sm'>version: v1.0.4</Text>
        </Stack>
      </Paper>
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
