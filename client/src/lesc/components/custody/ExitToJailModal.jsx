import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function ExitToJailModal ({
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
      radius='lg'
      styles={{
        content: {
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
        body: {
          padding: 20,
        },
      }}
    >
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group justify='space-between' align='flex-start' wrap='nowrap'>
            <Title order={4} fw={400} fz={20} lh='24px'>Exit this person to jail?</Title>
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
            &bull; This person will move to &quot;Transferred to jail&quot; for 24 hours.
            <br />
            &bull; They will be removed from in-custody lists and only appear under Not in custody.
            <br />
            &bull; Their property record will be marked as returned.
          </Text>
        </Stack>

        <Group gap='sm' justify='flex-start' wrap='wrap'>
          <Button
            variant='light'
            color='red'
            radius='xl'
            size='lg'
            onClick={onClose}
            disabled={loading}
          >
            No, cancel
          </Button>
          <Button
            color='indigo'
            radius='xl'
            size='lg'
            onClick={onConfirm}
            loading={loading}
          >
            Yes, exit to jail
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ExitToJailModal;
