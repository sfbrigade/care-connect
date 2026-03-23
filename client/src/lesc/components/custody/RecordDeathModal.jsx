import React from 'react';
import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

function RecordDeathModal ({
  opened,
  onClose,
  onConfirm,
  loading = false,
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      centered
      lockScroll
      withCloseButton={false}
      styles={{
        body: {
          padding: '2rem 1.5rem',
        }
      }}
    >
      <Stack gap='xl'>
        <IconAlertCircle size={48} color='var(--mantine-color-red-6)' />

        <Stack gap='sm'>
          <Title order={3}>Record death?</Title>
          <Text size='md'>
            This action cannot be undone. Recording this death will automatically release any holds or chairs associated with this person. Their record will no longer be available to you in CareConnect.
            <br />
            <br />
            Please follow RESET protocols for handling any property.
          </Text>
        </Stack>

        <Group gap='sm' justify='flex-start'>
          <Button
            variant='destructive'
            onClick={onClose}
            disabled={loading}
          >
            No, cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
          >
            Yes, record
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default RecordDeathModal;
