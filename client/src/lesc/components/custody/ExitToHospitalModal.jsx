import React from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function ExitToHospitalModal ({
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
      size='sm'
      centered
      lockScroll
      withCloseButton={false}
    >
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group justify='space-between' align='center' wrap='nowrap'>
            <Title order={4}>Exit this person to hospital?</Title>
            <ActionIcon
              onClick={onClose}
              bg='rgba(134, 142, 150, 0.1)'
              c='black'
              radius='xl'
              w={40}
              h={40}
              ml='auto'
              disabled={loading}
              aria-label='Close'
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <Text size='sm' c='dimmed'>
            This step can&apos;t be undone. After you confirm:
            <br />
            &bull; This person will move to &quot;Transferred to hospital&quot; for 24 hours.
            <br />
            &bull; They will be removed from in-custody lists and only appear under Not in custody.
            <br />
            &bull; Their property record will be marked as returned.
          </Text>
        </Stack>

        <Group gap='sm' justify='flex-start' wrap='wrap'>
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
            Yes, exit to hospital
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ExitToHospitalModal;
