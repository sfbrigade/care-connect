import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function CancelIncidentModal ({
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
          <Group justify='space-between' align='center'>
            <Title order={4}>Cancel this incident?</Title>
            <ActionIcon onClick={onClose} bg='rgba(134, 142, 150, 0.1)' c='black' radius='xl' w={40} h={40}>
              <IconX size={20} />
            </ActionIcon>
          </Group>
          <Text size='sm' c='dimmed'>
            Canceling this incident will cancel all holds on chairs. You will not be able to make future changes to this incident.
          </Text>
        </Stack>
        <Group>
          <Button
            variant='destructive'
            onClick={onConfirm}
            disabled={loading}
          >
            Yes, cancel
          </Button>
          <Button
            variant='secondary'
            onClick={onClose}
            disabled={loading}
          >
            Keep incident
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default CancelIncidentModal;
