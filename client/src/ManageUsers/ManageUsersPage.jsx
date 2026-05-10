import { useState } from 'react';
import { Accordion, ActionIcon, Box, Button, Container, Group, Loader, Popover, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconInfoCircle, IconUserPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import ActionFooter from '@/components/ActionFooter';
import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useToast } from '@/components/ToastContext';
import MemberCard from './MemberCard';
import InviteUserModal from './InviteUserModal';
import ResendInviteModal from './ResendInviteModal';
import ConfirmActionModal from './ConfirmActionModal';
import { getRoleLabel } from './roleLabels';

function ManageUsersPage () {
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const organizationId = user.organizationId;

  const [inviteOpened, { open: openInvite, close: closeInvite }] = useDisclosure(false);
  const [resendTarget, setResendTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['members', organizationId],
    queryFn: () => Api.organizations.members(organizationId).then((res) => res.data),
  });

  function invalidateMembers () {
    queryClient.invalidateQueries({ queryKey: ['members', organizationId] });
  }

  async function handleResendInvite (member) {
    try {
      await Api.invites.resend(member.id);
      showToast('Invite resent', 'success', 4000, 'A new invite email has been sent.');
      invalidateMembers();
    } catch {
      showToast('Something went wrong', 'error', 4000, 'Please try again.');
    }
    setResendTarget(null);
  }

  async function handleCancelInvite (member) {
    try {
      await Api.invites.revoke(member.id);
      showToast('Invite canceled', 'success', 4000, 'The invite has been canceled.');
      invalidateMembers();
    } catch {
      showToast('Something went wrong', 'error', 4000, 'Please try again.');
    }
    setConfirmAction(null);
  }

  async function handleDisable (member) {
    try {
      await Api.users.update(member.id, { deactivatedAt: new Date().toISOString() });
      showToast('Account disabled', 'success', 4000, 'The account has been disabled.');
      invalidateMembers();
    } catch {
      showToast('Something went wrong', 'error', 4000, 'Please try again.');
    }
    setConfirmAction(null);
  }

  async function handleEnable (member) {
    try {
      await Api.users.update(member.id, { deactivatedAt: null });
      showToast('Account enabled', 'success', 4000, 'The account has been enabled.');
      invalidateMembers();
    } catch {
      showToast('Something went wrong', 'error', 4000, 'Please try again.');
    }
    setConfirmAction(null);
  }

  async function handleDelete (member) {
    try {
      await Api.users.update(member.id, { deletedAt: new Date().toISOString() });
      showToast('Account deleted', 'success', 4000, 'The account has been deleted.');
      invalidateMembers();
    } catch {
      showToast('Something went wrong', 'error', 4000, 'Please try again.');
    }
    setConfirmAction(null);
  }

  const sections = [
    { key: 'invited', label: 'Invited', tooltip: 'Users who have been sent an invite but have not yet accepted.' },
    { key: 'active', label: 'Active', tooltip: 'Users with active accounts who can sign in.' },
    { key: 'disabled', label: 'Disabled', tooltip: 'Accounts that have been disabled. They can be re-enabled.' },
  ];

  if (isLoading) {
    return (
      <Container ta='center' py='xl'>
        <Loader />
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Account management</title>
      </Head>
      <Container>
        <Accordion variant='contained' chevronPosition='left' multiple defaultValue={['invited', 'active', 'disabled']}>
          {sections.map(({ key, label, tooltip }) => {
            const members = data?.[key] ?? [];
            return (
              <Accordion.Item key={key} value={key}>
                <Group wrap='nowrap' gap={0}>
                  <Accordion.Control>
                    <Title order={4} ta='center'>{label}: {members.length}</Title>
                  </Accordion.Control>
                  <Box onClick={(e) => e.stopPropagation()} mr='sm'>
                    <Popover width={250} withArrow radius='md' shadow='none'>
                      <Popover.Target>
                        <ActionIcon variant='transparent' c='gray.5' size='md'>
                          <IconInfoCircle size={22} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown p='md' bg='dark' style={{ border: 'none' }}>
                        <Text size='sm' c='white'>{tooltip}</Text>
                      </Popover.Dropdown>
                    </Popover>
                  </Box>
                </Group>
                {members.length > 0 && (
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {members.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          roleLabel={getRoleLabel(key === 'invited' ? [] : member.roles, organizationId)}
                          {...(key === 'invited' && {
                            onResendInvite: (m) => setResendTarget(m),
                            onCancelInvite: (m) => setConfirmAction({ type: 'cancel', member: m }),
                          })}
                          {...(key === 'active' && {
                            onView: (m) => navigate(`/manage-users/${m.id}`),
                            onDisable: (m) => setConfirmAction({ type: 'disable', member: m }),
                          })}
                          {...(key === 'disabled' && {
                            onEnable: (m) => setConfirmAction({ type: 'enable', member: m }),
                            onDelete: (m) => setConfirmAction({ type: 'delete', member: m }),
                          })}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                )}
              </Accordion.Item>
            );
          })}
        </Accordion>

      </Container>
      <ActionFooter>
        <Button variant='light' leftSection={<IconUserPlus size={18} style={{ marginRight: 4 }} />} onClick={openInvite}>
          Send invite
        </Button>
      </ActionFooter>

      <InviteUserModal
        opened={inviteOpened}
        onClose={closeInvite}
        organizationId={organizationId}
        onSuccess={() => {
          showToast('Invite sent', 'success', 4000, 'The invite email has been sent.');
          invalidateMembers();
          closeInvite();
        }}
        onError={() => {
          showToast('Something went wrong', 'error', 4000, 'Please try again.');
        }}
      />

      <ResendInviteModal
        member={resendTarget}
        onClose={() => setResendTarget(null)}
        onConfirm={handleResendInvite}
      />

      <ConfirmActionModal
        action={confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const handlers = {
            cancel: handleCancelInvite,
            disable: handleDisable,
            enable: handleEnable,
            delete: handleDelete,
          };
          handlers[confirmAction.type](confirmAction.member);
        }}
      />
    </>
  );
}

export default ManageUsersPage;
