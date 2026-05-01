import React from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function SafetyCheckResultModal ({
  opened,
  onClose,
  onConfirmPassed,
  onConfirmFailed,
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
        <Stack gap='xs'>
          <Group justify='space-between' align='flex-start' wrap='nowrap'>
            <Title order={3}>Record safety check</Title>
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
              styles={{
                root: {
                  '&:focus': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                },
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <Text size='md'>Indicate a failed check if you have a safety concern that would require an exit to jail.</Text>
        </Stack>

        <Group gap='sm' justify='flex-start' wrap='nowrap' grow>
          <Button
            variant='destructive'
            onClick={onConfirmFailed}
            disabled={loading}
          >
            Failed
          </Button>
          <Button
            onClick={onConfirmPassed}
            loading={loading}
          >
            Passed
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default SafetyCheckResultModal;
