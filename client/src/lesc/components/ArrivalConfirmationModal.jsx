import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import classes from './CancelModal.module.css';

function ArrivalConfirmationModal({
  facilityName,
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
            <Title order={4}>Have you arrived at {facilityName}?</Title>
            <ActionIcon
              onClick={onClose}
              bg='rgba(134, 142, 150, 0.1)'
              c='black'
              radius='xl'
              className={classes.closeIcon}
              w={40}
              h={40}
              miw={40}
              maw={40}
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
          <Text style={{ color: '#212529' }}>Confirm that you've arrived at {facilityName} and can start custody transfer.</Text>
        </Stack>
        <Group>
          <Button
            flex={1}
            variant='destructive'
            onClick={onClose}
            disabled={loading}
          >
            Not yet
          </Button>
          <Button
            flex='0 0 auto'
            onClick={() => onConfirm()}
            disabled={loading}
          >
            Yes, I've arrived
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ArrivalConfirmationModal;
