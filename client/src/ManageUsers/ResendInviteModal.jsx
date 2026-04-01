import { Button, TextInput } from '@mantine/core';

import FullScreenModal from './FullScreenModal';

function ResendInviteModal ({ member, onClose, onConfirm }) {
  return (
    <FullScreenModal
      opened={!!member}
      onClose={onClose}
      subtitle='Resend invite'
      title='A new invite email will be sent to this user. Check email address.'
      actions={
        <>
          <Button variant='destructive' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(member)}>
            Resend invite
          </Button>
        </>
      }
    >
      <TextInput
        label='Email'
        value={member?.email ?? ''}
        disabled
        required
      />
    </FullScreenModal>
  );
}

export default ResendInviteModal;
