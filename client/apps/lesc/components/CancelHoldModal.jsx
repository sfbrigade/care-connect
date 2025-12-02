import { Modal, Stack, Text, Group, Button } from '@mantine/core';

/**
 * CancelHoldModal component matching Figma design
 * Confirmation modal for canceling a bed hold
 */
function CancelHoldModal ({
  opened,
  onClose,
  onConfirm,
  holdIdentifier = '001',
  holdName = 'John Doe',
  loading = false,
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      size='auto'
      centered
      lockScroll
      withCloseButton={false}
      styles={{
        content: {
          borderRadius: '8px',
          maxWidth: '329px',
        },
        body: {
          padding: '24px 20px',
        },
      }}
    >
      <Stack gap={24}>
        <Text
          style={{
            fontSize: '20px',
            lineHeight: '24px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 700,
            color: '#000000',
          }}
        >
          Cancel the hold for {holdIdentifier} {holdName}?
        </Text>

        <Text
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400,
            color: '#868e96',
          }}
        >
          This will release the bed back to available and remove their information from the system.
          <br />
          <br />
          This action cannot be undone.
        </Text>

        <Group justify='flex-end' gap={24}>
          <Button
            variant='subtle'
            onClick={onClose}
            disabled={loading}
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#212529',
              padding: 0,
            }}
          >
            Keep hold
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '6px 16px',
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
            }}
          >
            Cancel hold
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default CancelHoldModal;
