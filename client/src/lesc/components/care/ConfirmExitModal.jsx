import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

function ConfirmExitModal ({
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
      size='xs'
      centered
      lockScroll
      withCloseButton={false}
      padding='xl'
    >
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group justify='space-between' align='flex-start' wrap='nowrap'>
            <Title order={4}>Confirm this exit from RESET?</Title>
            <ActionIcon
              onClick={onClose}
              bg='rgba(134, 142, 150, 0.1)'
              c='black'
              radius='50%'
              ml='auto'
              disabled={loading}
              aria-label='Close'
              style={{
                width: 40,
                height: 40,
                minWidth: 40,
                flex: '0 0 40px',
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <Text size='sm' c='dimmed'>
            This step can&apos;t be undone. The person&apos;s details will no longer be visible to you in CareConnect.
          </Text>
        </Stack>
        <Stack gap='sm' align='flex-start'>
          <Button
            variant='destructive'
            size='lg'
            radius='xl'
            onClick={onClose}
            disabled={loading}
          >
            No, keep them onsite
          </Button>
          <Button
            color='indigo'
            size='lg'
            radius='xl'
            onClick={onConfirm}
            loading={loading}
          >
            Yes, confirm exit
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

export default ConfirmExitModal;
