import { useState } from 'react';
import { Button, Group, List, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import IconButtonLink from '@/components/IconButtonLink';

import CancelReasonSelector from './CancelReasonSelector';

function formatSubjectName (deflection) {
  return [deflection.subject?.firstName, deflection.subject?.middleInitial, deflection.subject?.lastName]
    .filter(Boolean)
    .join(' ');
}

function CancelHoldModal ({
  deflections,
  opened,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [cancelReason, setCancelReason] = useState();

  const list = deflections ?? [];
  const count = list.length;
  const anyHasSubject = list.some(d => !!d.subjectId);
  const reasonRequired = anyHasSubject;
  const singleName = count === 1 ? formatSubjectName(list[0]) : '';

  let title;
  if (count > 1) {
    title = `Cancel ${count} holds?`;
  } else if (singleName) {
    title = `Cancel hold for ${singleName}?`;
  } else {
    title = 'Cancel this hold?';
  }

  let explanation;
  if (anyHasSubject) {
    explanation = count > 1
      ? 'Canceling these holds means the chairs will no longer be reserved. Identifying information for anyone with subject details will also be removed.'
      : 'Canceling a hold means a chair will no longer be reserved. This person\'s identifying information will also be removed.';
  } else {
    explanation = count > 1
      ? 'If you cancel these holds, they will be removed and the chairs will become available again.'
      : 'If you cancel this hold, it will be removed and the chair will become available again.';
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      centered
      lockScroll
      withCloseButton={false}
    >
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group justify='space-between' align='center' wrap='nowrap'>
            <Title order={4}>{title}</Title>
            <IconButtonLink
              icon={IconX}
              onClick={onClose}
              aria-label='Close'
            />
          </Group>
          {count > 1 && (
            <List size='sm' withPadding>
              {list.map((d) => {
                const name = formatSubjectName(d);
                return (
                  <List.Item key={d.id}>
                    {name ? `Hold ${d.id} — ${name}` : `Hold ${d.id} (no subject details)`}
                  </List.Item>
                );
              })}
            </List>
          )}
          <Text size='sm' c='dimmed'>{explanation}</Text>
          <CancelReasonSelector
            value={cancelReason}
            onChange={setCancelReason}
            enabled={reasonRequired}
          />
        </Stack>
        <Group grow preventGrowOverflow={false}>
          <Button
            variant='destructive'
            onClick={() => onConfirm(cancelReason)}
            disabled={loading || (reasonRequired && !cancelReason)}
          >
            Yes, cancel
          </Button>
          <Button
            variant='secondary'
            onClick={onClose}
            disabled={loading}
          >
            Keep hold{count > 1 ? 's' : ''}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default CancelHoldModal;
