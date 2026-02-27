import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function File647fModal ({
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
          <Group justify='space-between' align='flex-start' wrap='nowrap'>
            <Title order={4}>Save changes and file a new 647(f)?</Title>
            <ActionIcon onClick={onClose} variant='subtle' c='black' radius='xl' size='lg' flex='none'>
              <IconX size={18} />
            </ActionIcon>
          </Group>
          <Text size='sm' c='dimmed'>
            These updates will create and file a new 647(f) record with SFPD.
            The existing 647(f) will remain on file as a prior version.
          </Text>
        </Stack>
        <Group justify='flex-end'>
          <Button variant='light' color='red' onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} loading={loading}>Yes, save changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default File647fModal;
