import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';

const ACTION_CONFIG = {
  cancel: {
    title: (email) => `Cancel invite for ${email}?`,
    description: 'This invite link will stop working.',
    confirmLabel: 'Cancel invite',
    cancelLabel: 'Keep invite',
    destructive: true,
  },
  disable: {
    title: (email) => `Disable account for ${email}?`,
    description: "This user won't be able to sign in or use the app until re-enabled.",
    confirmLabel: 'Disable account',
    cancelLabel: 'Cancel',
    destructive: true,
  },
  enable: {
    title: (email) => `Enable account for ${email}?`,
    description: 'This user will be able to sign in and use the app again.',
    confirmLabel: 'Enable account',
    cancelLabel: 'Cancel',
    destructive: false,
  },
  delete: {
    title: (email) => `Delete account for ${email}?`,
    description: 'The user will no longer be able to sign in and use the app. This cannot be undone.',
    confirmLabel: 'Delete account',
    cancelLabel: 'Cancel',
    destructive: true,
  },
};

function ConfirmActionModal ({ action, onClose, onConfirm }) {
  if (!action) return null;

  const config = ACTION_CONFIG[action.type];
  if (!config) return null;

  return (
    <Modal opened={!!action} onClose={onClose} size='sm' centered withCloseButton={false}>
      <Stack gap='md'>
        <Title order={3}>{config.title(action.member.email)}</Title>
        <Text c='dimmed'>{config.description}</Text>
        <Group>
          <Button variant='destructive' onClick={onClose}>
            {config.cancelLabel}
          </Button>
          <Button
            color={config.destructive ? 'red' : 'blue'}
            onClick={onConfirm}
          >
            {config.confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ConfirmActionModal;
