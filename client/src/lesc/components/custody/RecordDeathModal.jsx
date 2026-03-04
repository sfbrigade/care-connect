import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

function RecordDeathModal ({
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
      size={376}
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
        <IconAlertCircle size={48} color='var(--mantine-color-red-6)' />

        <Stack gap='sm'>
          <Title order={2} fw={400} fz={24} lh='32px'>Record death?</Title>
          <Text size='md' lh='24px'>
            This action cannot be undone. Recording this death will automatically release any holds or chairs associated with this person. Their record will no longer be available to you in CareConnect.
            <br />
            <br />
            Please follow RESET protocols for handling any property.
          </Text>
        </Stack>

        <Group gap='sm' justify='flex-start'>
          <Button
            variant='light'
            color='red'
            radius='xl'
            size='lg'
            onClick={onClose}
            disabled={loading}
            styles={{
              root: {
                '&:focus': { outline: 'none', boxShadow: 'none' },
                '&:focus-visible': { outline: 'none', boxShadow: 'none' },
              },
            }}
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
            Yes, record
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default RecordDeathModal;
