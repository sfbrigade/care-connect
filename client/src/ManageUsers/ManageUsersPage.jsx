import { useState } from 'react';
import { Accordion, Button, Container, Group, Loader, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconUserPlus } from '@tabler/icons-react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useToast } from '@/components/ToastContext';
import MemberCard from './MemberCard';
import InviteUserModal from './InviteUserModal';
import ResendInviteModal from './ResendInviteModal';
import ConfirmActionModal from './ConfirmActionModal';
import SectionLabel from '@/components/SectionLabel';
import { getRoleLabel } from './roleLabels';

function ManageUsersPage () {
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
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
        <Accordion variant='section' chevronPosition='left' multiple defaultValue={['invited', 'active', 'disabled']}>
          <Accordion.Item value='invited'>
            <Accordion.Control>
              <SectionLabel label={`Invited: ${data?.invited?.length ?? 0}`} info='Users who have been sent an invite but have not yet accepted.' />
            </Accordion.Control>
            {data?.invited?.length > 0 && (
              <Accordion.Panel>
                <Stack gap='sm'>
                  {data.invited.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      roleLabel={getRoleLabel([], organizationId)}
                      onResendInvite={(m) => setResendTarget(m)}
                      onCancelInvite={(m) => setConfirmAction({ type: 'cancel', member: m })}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            )}
          </Accordion.Item>

          <Accordion.Item value='active'>
            <Accordion.Control>
              <SectionLabel label={`Active: ${data?.active?.length ?? 0}`} info='Users with active accounts who can sign in.' />
            </Accordion.Control>
            {data?.active?.length > 0 && (
              <Accordion.Panel>
                <Stack gap='sm'>
                  {data.active.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      roleLabel={getRoleLabel(member.roles, organizationId)}
                      onDisable={(m) => setConfirmAction({ type: 'disable', member: m })}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            )}
          </Accordion.Item>

          <Accordion.Item value='disabled'>
            <Accordion.Control>
              <SectionLabel label={`Disabled: ${data?.disabled?.length ?? 0}`} info='Accounts that have been disabled. They can be re-enabled.' />
            </Accordion.Control>
            {data?.disabled?.length > 0 && (
              <Accordion.Panel>
                <Stack gap='sm'>
                  {data.disabled.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      roleLabel={getRoleLabel(member.roles, organizationId)}
                      onEnable={(m) => setConfirmAction({ type: 'enable', member: m })}
                      onDelete={(m) => setConfirmAction({ type: 'delete', member: m })}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            )}
          </Accordion.Item>
        </Accordion>

        <Group justify='center' mt={48} mb='xl'>
          <Button variant='light' leftSection={<IconUserPlus size={18} style={{ marginRight: 4 }} />} bd='5px solid white' onClick={openInvite}>
            Send invite
          </Button>
        </Group>
      </Container>

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
