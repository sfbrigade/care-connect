import { useState } from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import CancelReasonSelector from './CancelReasonSelector';

function CancelHoldModal ({
  deflection,
  opened,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [cancelReasonId, setCancelReasonId] = useState();

  const name = [deflection.subject?.firstName, deflection.subject?.middleInitial, deflection.subject?.lastName].filter(Boolean).join(' ');

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
            {!name && <Title order={4}>Cancel this hold?</Title>}
            {!!name && <Title order={4}>Cancel hold for {name}?</Title>}
            <ActionIcon onClick={onClose} bg='rgba(134, 142, 150, 0.1)' c='black' radius='xl' w={40} h={40}>
              <IconX size={20} />
            </ActionIcon>
          </Group>
          {!deflection.subjectId && <Text size='sm' c='dimmed'>If you cancel this hold, it will be removed and the chair will become available again.</Text>}
          {!!deflection.subjectId && <Text size='sm' c='dimmed'>Canceling a hold means a chair will no longer be reserved. This person's identifying information will also be removed.</Text>}
          <CancelReasonSelector
            value={cancelReasonId}
            onChange={setCancelReasonId}
            enabled={!!deflection.subjectId}
          />
        </Stack>
        <Group grow>
          <Button
            variant='destructive'
            onClick={() => onConfirm(cancelReasonId)}
            disabled={loading || (!cancelReasonId && !!deflection.subjectId)}
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
