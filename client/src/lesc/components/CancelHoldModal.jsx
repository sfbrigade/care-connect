import { useState } from 'react';
import { Button, Chip, Group, Modal, Stack, Text, Title } from '@mantine/core';

function CancelHoldModal ({
  deflection,
  opened,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [cancelReasonId, setCancelReasonId] = useState();

  // const { data: cancelReasons } = useQuery({
  //   queryKey: ['deflectionCancelReasons'],
  //   queryFn: () => Api.deflectionCancelReasons.index().then(response => response.data),
  // });

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
          <Chip.Group value={cancelReasonId} onChange={setCancelReasonId} />
        )}
        <Group grow>
          <Button
            variant='light'
            color='red.6'
            onClick={() => onConfirm(cancelReasonId)}
            disabled={loading}
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
