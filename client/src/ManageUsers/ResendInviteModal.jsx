import { Button, Group, Modal, Stack, TextInput, Title } from '@mantine/core';

function ResendInviteModal ({ member, onClose, onConfirm }) {
  return (
    <Modal opened={!!member} onClose={onClose} size='sm' centered withCloseButton={false}>
      <Stack gap='md'>
        <div>
          <Title order={5} c='dimmed'>Resend invite</Title>
          <Title order={3}>A new invite email will be sent to this user. Check email address.</Title>
        </div>
        <TextInput
          label='Email'
          value={member?.email ?? ''}
          disabled
          required
        />
        <Group>
          <Button variant='subtle' c='red' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(member)}>
            Resend invite
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ResendInviteModal;
