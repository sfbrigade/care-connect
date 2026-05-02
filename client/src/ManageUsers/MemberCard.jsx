import { Button, Card, Group, Stack, Text } from '@mantine/core';

import classes from './MemberCard.module.css';

function MemberCard ({ member, roleLabel, onView, onResendInvite, onCancelInvite, onDisable, onEnable, onDelete }) {
  const isInvite = member.type === 'invite';
  const isNavigable = !isInvite && !!onView;

  function stopActionClick (event, action) {
    event.stopPropagation();
    action(member);
  }

  return (
    <Card
      className={classes.card}
      role={isNavigable ? 'button' : undefined}
      tabIndex={isNavigable ? 0 : undefined}
      onClick={isNavigable ? () => onView(member) : undefined}
      onKeyDown={isNavigable
        ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onView(member);
            }
          }
        : undefined}
    >
      <Stack gap='md'>
        <Stack gap='xs'>
          <Stack gap={0}>
            <Text className={classes.role}>
              {roleLabel}{!isInvite && member.isCurrentUser ? ' (you)' : ''}
            </Text>
            <Text className={classes.name}>{member.firstName} {member.lastName}</Text>
            <Text className={classes.email}>{member.email}</Text>
          </Stack>
        </Stack>
        {!member.isCurrentUser && (
          <Group gap='sm'>
            {isInvite && (
              <>
                <Button variant='light' size='md' onClick={(event) => stopActionClick(event, onResendInvite)}>
                  Resend invite
                </Button>
                <Button variant='destructive' size='md' onClick={(event) => stopActionClick(event, onCancelInvite)}>
                  Cancel
                </Button>
              </>
            )}
            {!isInvite && !member.deactivatedAt && (
              <Button variant='destructive' size='md' onClick={(event) => stopActionClick(event, onDisable)}>
                Disable
              </Button>
            )}
            {!isInvite && member.deactivatedAt && (
              <>
                <Button variant='light' size='md' onClick={(event) => stopActionClick(event, onEnable)}>
                  Enable
                </Button>
                <Button variant='destructive' size='md' onClick={(event) => stopActionClick(event, onDelete)}>
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
