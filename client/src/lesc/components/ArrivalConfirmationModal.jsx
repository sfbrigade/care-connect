import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import IconButtonLink from '@/components/IconButtonLink';

function ArrivalConfirmationModal ({
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
            <IconButtonLink
              icon={IconX}
              onClick={onClose}
              aria-label='Close'
            />
          </Group>
          <Text>Confirm that you've arrived at {facilityName} and can start custody transfer.</Text>
        </Stack>
        <Group spacing='sm'>
          <Button
            variant='destructive'
            onClick={onClose}
            disabled={loading}
          >
            Not yet
          </Button>
          <Button
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
