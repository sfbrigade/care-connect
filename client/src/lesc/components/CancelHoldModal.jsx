import { useState } from 'react';
import { Button, Chip, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';

function CancelHoldModal ({
  deflection,
  opened,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [cancelReasonId, setCancelReasonId] = useState();

  const { data: cancelReasons } = useQuery({
    queryKey: ['deflectionCancelReasons'],
    queryFn: () => Api.deflections.cancelReasons.index().then(response => response.data),
    enabled: !!deflection?.subjectId,
  });

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
          {!name && <Title order={4}>Cancel this hold?</Title>}
          {!!name && <Title order={4}>Cancel hold for {name}?</Title>}
          {!deflection.subjectId && <Text size='sm' c='dimmed'>If you cancel this hold, it will be removed and the chair will become available again.</Text>}
          {!!deflection.subjectId && <Text size='sm' c='dimmed'>Canceling a hold means a chair will no longer be reserved. This person's identifying information will also be removed.</Text>}
        </Stack>
        {!!deflection.subjectId && (
          <Chip.Group value={cancelReasonId} onChange={setCancelReasonId}>
            <Group gap='sm'>
              {cancelReasons?.map(reason => (
                <Chip key={reason.id} value={reason.id} size='lg'>
                  {reason.name}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        )}
        <Group grow>
          <Button
            variant='light'
            color='red.6'
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
