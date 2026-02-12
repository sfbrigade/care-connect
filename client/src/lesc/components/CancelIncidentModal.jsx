import { useEffect, useState } from 'react';
import { ActionIcon, Button, Group, List, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import CancelReasonSelector from './CancelReasonSelector';

function CancelIncidentModal ({
  opened,
  onClose,
  onConfirm,
  requiresReason = false,
  loading = false,
}) {
  const [cancelReasonId, setCancelReasonId] = useState();

  useEffect(() => {
    if (!opened) {
      setCancelReasonId(undefined);
    }
  }, [opened]);

  const confirmDisabled = loading || (requiresReason && !cancelReasonId);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      size='sm'
      padding='lg'
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
          {!requiresReason && (
            <Text size='sm' c='dimmed'>
              Canceling this incident will cancel all holds on chairs. You will not be able to make future changes to this incident.
            </Text>
          )}
          {requiresReason && (
            <Stack gap='xs' pr='md'>
              <Text size='sm' c='dimmed'>Canceling this incident will:</Text>
              <List size='sm' c='dimmed' pl='sm' my={0}>
                <List.Item>cancel all holds on chairs</List.Item>
                <List.Item>remove all identifying information associated with a hold</List.Item>
              </List>
              <Text size='sm' c='dimmed'>You will not be able to make future changes to this incident.</Text>
            </Stack>
          )}

          <CancelReasonSelector
            value={cancelReasonId}
            onChange={setCancelReasonId}
            enabled={requiresReason}
            stacked
          />
        </Stack>
        <Group>
          <Button
            variant='destructive'
            onClick={() => onConfirm(cancelReasonId)}
            disabled={confirmDisabled}
          >
            Yes, cancel
          </Button>
          <Button
            variant='filled'
            color='indigo.6'
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
