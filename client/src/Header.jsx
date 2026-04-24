import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { StatusCodes } from 'http-status-codes';
import { Badge, Burger, Box, Container, Group, Menu, Text, Title } from '@mantine/core';
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
import {
  clearStoredWorkMode,
  getWorkModeFromPath,
  readStoredWorkMode,
  writeStoredWorkMode,
} from './utils/workMode';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/components/ToastContext';

const MODE_HOME_PATH = { FIELD: '/holds', CUSTODY: '/custody' };
const MODE_LABEL = { FIELD: 'In the field', CUSTODY: 'At RESET' };
const MODE_BADGE_LABEL = { FIELD: 'FIELD', CUSTODY: 'RESET' };
const MODE_COLOR = { FIELD: 'violet', CUSTODY: 'green' };
const OPPOSITE_MODE = { FIELD: 'CUSTODY', CUSTODY: 'FIELD' };
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
  body: 'You have active field work. Transfer, hand off, or cancel active holds (or close out your arrival) before switching work modes.',
};

function fetchMe () {
  return Api.users.me().then((r) => r.status === StatusCodes.OK ? r.data : null);
}

function Header ({ opened, close, toggle, logout }) {
  const { facility } = useFacilityContext();
  const { user } = useAuthContext();
  const { isOrgAdmin, isField, isCustody } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const isDualRole = isField && isCustody;

  const location = useLocation();
  const routeMode = isDualRole ? getWorkModeFromPath(location.pathname) : null;
  const [storedMode, setStoredMode] = useState(() => (isDualRole ? readStoredWorkMode() : null));

  useEffect(() => {
    if (!routeMode) return;
    // Don't persist a CUSTODY landing if the guard is about to bounce the
    // user back for active field work — leaves localStorage on FIELD.
    const latest = queryClient.getQueryData(['users', 'me']);
    if (routeMode === 'CUSTODY' && latest?.hasActiveFieldWork) return;
    writeStoredWorkMode(routeMode);
    setStoredMode(routeMode);
  }, [routeMode, queryClient]);

  // Route is the source of truth when present; localStorage fills in on
  // mode-agnostic routes (e.g. /profile, /manage-users) so the submenu
  // still reflects the user's last-known mode across sessions.
  const workMode = routeMode ?? storedMode;

  // Share the cache key with AuthContextProvider so only one /api/users/me
  // query exists. This observer adds a poll interval for dual-role users and
  // provides hasActiveFieldWork for the work-mode submenu.
  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: fetchMe,
    enabled: isDualRole,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
  });

  const hasActiveFieldWork = !!me?.hasActiveFieldWork;

  const handleMenuOpen = useCallback(() => {
    if (isDualRole) {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    }
  }, [isDualRole, queryClient]);

  function handleModeClick (targetMode) {
    close();
    if (targetMode === workMode) return;
    // Re-read from cache at click time so we act on the freshest value that
    // the invalidate-on-open refetch may have landed since render.
    const latest = queryClient.getQueryData(['users', 'me']);
    const blocked = targetMode === 'CUSTODY' && !!latest?.hasActiveFieldWork;
    if (blocked) {
      showToast(BLOCKED_TOAST.title, 'error', 5000, BLOCKED_TOAST.body);
      return;
    }
    navigate(MODE_HOME_PATH[targetMode]);
    const copy = MODE_SUCCESS_TOAST[targetMode];
    showToast(copy.title, 'success', 4000, copy.body);
  }

  return (
    <Container h='100%'>
      <Group h='100%' align='center' justify='space-between' wrap='nowrap'>
        <Link to='/' onClick={close} style={{ minWidth: 0 }}>
          <Box>
            <Group gap='xs' wrap='nowrap' align='center'>
              <Title order={3} c='black' truncate>{facility ? `${user?.rank ?? ''} ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : 'CareConnectSF'}</Title>
              {facility && isDualRole && workMode && (
                <Badge
                  color={MODE_COLOR[workMode]}
                  variant='light'
                  size='lg'
                  role='button'
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleModeClick(OPPOSITE_MODE[workMode]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleModeClick(OPPOSITE_MODE[workMode]);
                    }
                  }}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  aria-label={`Switch work mode to ${MODE_LABEL[OPPOSITE_MODE[workMode]]}`}
                >
                  {MODE_BADGE_LABEL[workMode]}
                </Badge>
              )}
            </Group>
            {user?.unit?.name && (
              <Text size='sm' color='dimmed' truncate>
                {user.unit.name}
              </Text>
            )}
          </Box>
        </Link>
        <Group wrap='nowrap' style={{ flexShrink: 0 }}>
          {user &&
            <Menu position='bottom-end' width={280} onOpen={handleMenuOpen} onClose={close}>
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
                {isDualRole && (
                  <>
                    <Menu.Label>
                      <Group gap={8} align='center'>
                        <IconArrowsLeftRight size={20} color='var(--mantine-color-gray-5)' />
                        <Text size='sm' c='dark.9' fw={400}>Work mode</Text>
                      </Group>
                    </Menu.Label>
                    {['FIELD', 'CUSTODY'].map((m) => {
                      const isCurrent = m === workMode;
                      const isBlocked = m === 'CUSTODY' && hasActiveFieldWork && !isCurrent && !isLoading;
                      return (
                        <Menu.Item
                          key={m}
                          onClick={() => handleModeClick(m)}
                          pl={44}
                          rightSection={isCurrent ? <IconCheck size={16} color={`var(--mantine-color-${MODE_COLOR[m]}-6)`} /> : null}
                          c={isBlocked ? 'var(--mantine-color-gray-5)' : undefined}
                          aria-label={`Work mode: ${MODE_LABEL[m]}`}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-disabled={isBlocked || undefined}
                        >
                          <Group gap={8} align='center' wrap='nowrap'>
                            <Box
                              w={10}
                              h={10}
                              bg={`var(--mantine-color-${MODE_COLOR[m]}-6)`}
                              style={{ borderRadius: '50%', flexShrink: 0 }}
                            />
                            <span>{MODE_LABEL[m]}</span>
                          </Group>
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
                  onClick={(e) => { clearStoredWorkMode(); logout(e); }}
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
