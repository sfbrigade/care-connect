import { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getWorkModeFromPath } from './utils/workMode';
import { Burger, Box, Container, Group, Menu, Text, Title } from '@mantine/core';
import {
  IconSend,
  IconHome,
  IconAddressBook,
  IconArrowsLeftRight,
  IconCheck,
  IconLogout,
  IconUser
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Api from './Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/components/ToastContext';

const MODE_HOME_PATH = { FIELD: '/holds', CUSTODY: '/custody' };
const MODE_LABEL = { FIELD: 'In the field', CUSTODY: 'At RESET' };
const MODE_SUCCESS_TOAST = {
  FIELD: {
    title: 'Mode changed to "In the field"',
    body: 'You can now place holds, add arrest details, and bring persons to RESET.',
  },
  CUSTODY: {
    title: 'Mode changed to "At RESET"',
    body: 'You can now receive custody and manage facility tasks.',
  },
};
const BLOCKED_TOAST = {
  title: 'Couldn\'t update work mode',
  body: 'You have active holds. You must transfer, hand off, or cancel these holds first before switching work modes.',
};

function Header ({ opened, close, toggle, logout }) {
  const { facility } = useFacilityContext();
  const { user } = useAuthContext();
  const { isOrgAdmin, isField, isCustody } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const canChangeWorkMode = isField && isCustody;

  const location = useLocation();
  const workMode = canChangeWorkMode ? getWorkModeFromPath(location.pathname) : null;
  const workModeLabel = workMode ? MODE_LABEL[workMode] : null;

  const { data: meData } = useQuery({
    queryKey: ['users', 'me', 'work-mode-status'],
    queryFn: () => Api.users.me().then((r) => r.data),
    enabled: canChangeWorkMode,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const hasActiveFieldWork = !!meData?.hasActiveFieldWork;

  const handleMenuChange = useCallback((isOpen) => {
    if (isOpen && canChangeWorkMode) {
      queryClient.invalidateQueries({ queryKey: ['users', 'me', 'work-mode-status'] });
    }
  }, [canChangeWorkMode, queryClient]);

  function handleModeClick (targetMode) {
    close();
    if (targetMode === workMode) return;
    if (targetMode === 'CUSTODY' && hasActiveFieldWork) {
      showToast(BLOCKED_TOAST.title, 'error', 5000, BLOCKED_TOAST.body);
      return;
    }
    const path = MODE_HOME_PATH[targetMode];
    navigate(path);
    const copy = MODE_SUCCESS_TOAST[targetMode];
    showToast(copy.title, 'success', 4000, copy.body);
  }

  return (
    <Container h='100%'>
      <Group h='100%' align='center' justify='space-between' wrap='nowrap'>
        <Link to='/' onClick={close} style={{ minWidth: 0 }}>
          <Box>
            <Title order={3} c='black' truncate>{facility ? `${user?.rank ?? ''} ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : 'CareConnectSF'}</Title>
            {(workModeLabel || user?.unit?.name) && (
              <Text size='sm' color='dimmed' truncate>
                {workModeLabel && <>{workModeLabel}{user?.unit?.name ? ' | ' : ''}</>}
                {user?.unit?.name}
              </Text>
            )}
          </Box>
        </Link>
        <Group wrap='nowrap' style={{ flexShrink: 0 }}>
          {user &&
            <Menu position='bottom-end' width={280} onChange={handleMenuChange} onDismiss={close}>
              <Menu.Target>
                <Burger opened={opened} onClick={toggle} aria-label={opened ? 'Close menu' : 'Open menu'} />
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconHome size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/'
                  label='Home'
                  onClick={close}
                >
                  Home
                </Menu.Item>
                {isOrgAdmin && (
                  <Menu.Item
                    leftSection={<IconAddressBook size={20} color='var(--mantine-color-gray-5)' />}
                    component={Link}
                    to='/manage-users'
                    onClick={close}
                  >
                    Manage users
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconUser size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/profile'
                  onClick={close}
                >
                  Profile
                </Menu.Item>
                {canChangeWorkMode && (
                  <>
                    <Menu.Label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        paddingTop: 8,
                        color: 'var(--mantine-color-dark-9)',
                        fontSize: 'var(--mantine-font-size-sm)',
                        fontWeight: 400,
                      }}
                    >
                      <IconArrowsLeftRight size={20} color='var(--mantine-color-gray-5)' />
                      <span>Work mode</span>
                    </Menu.Label>
                    {['FIELD', 'CUSTODY'].map((m) => {
                      const isCurrent = m === workMode;
                      const isBlocked = m === 'CUSTODY' && hasActiveFieldWork && !isCurrent;
                      return (
                        <Menu.Item
                          key={m}
                          onClick={() => handleModeClick(m)}
                          pl={44}
                          rightSection={isCurrent ? <IconCheck size={16} color='var(--mantine-color-blue-6)' /> : null}
                          c={isBlocked ? 'var(--mantine-color-gray-5)' : undefined}
                          aria-label={`Work mode: ${MODE_LABEL[m]}`}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-disabled={isBlocked || undefined}
                        >
                          {MODE_LABEL[m]}
                        </Menu.Item>
                      );
                    })}
                  </>
                )}
                <Menu.Item
                  leftSection={<IconSend size={20} color='var(--mantine-color-gray-5)' />}
                  component={Link}
                  to='/feedback'
                  onClick={close}
                >
                  Share feedback
                </Menu.Item>
                {user?.isAdmin && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Admin</Menu.Label>
                    <Menu.Item component={Link} to='/admin/enums' onClick={close}>Enums</Menu.Item>
                    <Menu.Item component={Link} to='/admin/facilities' onClick={close}>Facilities</Menu.Item>
                    <Menu.Item component={Link} to='/admin/invites' onClick={close}>Invites</Menu.Item>
                    <Menu.Item component={Link} to='/admin/organizations' onClick={close}>Organizations</Menu.Item>
                    <Menu.Item component={Link} to='/admin/users' onClick={close}>Users</Menu.Item>
                    <Menu.Divider />
                  </>
                )}
                <Menu.Item
                  color='red'
                  leftSection={<IconLogout size={20} />}
                  to='/logout'
                  onClick={logout}
                >
                  Logout
                </Menu.Item>
                <Menu.Item>
                  <Text c='gray.5' size='xs'>
                    Version 1.0
                  </Text>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>}
        </Group>
      </Group>
    </Container>
  );
}

export default Header;
