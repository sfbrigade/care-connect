import { Modal, Stack, Text, Title, Group, Button } from '@mantine/core';

function CancelHoldModal ({
  deflection,
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
          <Title order={4}>Cancel this hold?</Title>
          <Text size='sm' c='dimmed'>If you cancel this hold, it will be removed and the chair will become available again.</Text>
        </Stack>
        <Group grow>
          <Button
            variant='light'
            color='red.6'
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
            Keep hold
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default CancelHoldModal;
