import { Button, Card, Group, Stack, Text } from '@mantine/core';

function MemberCard ({ member, roleLabel, onResendInvite, onCancelInvite, onDisable, onEnable, onDelete }) {
  const isInvite = member.type === 'invite';

  return (
    <Card bg='white' p='md' withBorder>
      <Stack gap='xs'>
        <Text size='sm' c='dimmed'>
          {roleLabel}{!isInvite && member.isCurrentUser ? ' (you)' : ''}
        </Text>
        <Text fw={600}>{member.firstName} {member.lastName}</Text>
        <Text size='sm' c='dimmed'>{member.email}</Text>
        {!member.isCurrentUser && (
          <Group gap='xs' mt='xs'>
            {isInvite && (
              <>
                <Button variant='light' size='xs' onClick={() => onResendInvite(member)}>
                  Resend invite
                </Button>
                <Button variant='destructive' size='xs' onClick={() => onCancelInvite(member)}>
                  Cancel
                </Button>
              </>
            )}
            {!isInvite && !member.deactivatedAt && (
              <Button variant='destructive' size='xs' onClick={() => onDisable(member)}>
                Disable
              </Button>
            )}
            {!isInvite && member.deactivatedAt && (
              <>
                <Button variant='light' size='xs' onClick={() => onEnable(member)}>
                  Enable
                </Button>
                <Button variant='destructive' size='xs' onClick={() => onDelete(member)}>
                  Delete account
                </Button>
              </>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export default MemberCard;
