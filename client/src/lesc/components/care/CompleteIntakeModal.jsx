import React from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function CompleteIntakeModal ({
  opened,
  onClose,
  onConfirmCompleted,
  onConfirmNotCompleted,
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
      padding='md'
    >
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group justify='space-between' align='flex-start' wrap='nowrap'>
            <Title order={4}>Update intake status</Title>
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
            Were you able to complete the full medical intake for this person? If not, person will be returned to Deputy's custody for further handling - this is irreversible.
          </Text>
        </Stack>

        <Stack gap='sm'>
          <Button
            variant='outline'
            color='red'
            size='lg'
            radius='xl'
            onClick={onConfirmNotCompleted}
            loading={loading}
          >
            Failed intake - return to Deputy
          </Button>
          <Button
            color='indigo'
            size='lg'
            radius='xl'
            onClick={onConfirmCompleted}
            loading={loading}
          >
            Yes, intake completed
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

export default CompleteIntakeModal;
