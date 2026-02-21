import { useEffect, useState } from 'react';
import { ActionIcon, Button, Group, List, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import CancelReasonSelector from './CancelReasonSelector';
import classes from './CancelModal.module.css';

function CancelIncidentModal ({
  opened,
  onClose,
  onConfirm,
  requiresReason = false,
  isLastHoldDetailedCancellation = false,
  loading = false,
}) {
  const [cancelReasonId, setCancelReasonId] = useState();

  useEffect(() => {
    if (!opened) {
      setCancelReasonId(undefined);
    }
  }, [opened]);

  const confirmDisabled = loading || (requiresReason && !cancelReasonId);
  const title = isLastHoldDetailedCancellation ? 'Cancel the last hold of this incident?' : 'Cancel this incident?';
  const keepLabel = isLastHoldDetailedCancellation ? 'Keep hold' : 'Keep incident';
  const reasonPrompt = isLastHoldDetailedCancellation
    ? 'Select a reason for canceling the hold'
    : 'Select a reason for canceling the hold(s)';

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
          <Group justify='space-between' align='center' wrap='nowrap'>
            <Title order={4} style={{ flex: 1 }}>{title}</Title>
            <ActionIcon onClick={onClose} bg='rgba(134, 142, 150, 0.1)' c='black' radius='xl' className={classes.closeIcon} w={40} h={40}>
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
              <Text size='sm' c='dimmed'>
                {isLastHoldDetailedCancellation ? 'Canceling the last hold of this incident will' : 'Canceling this incident will:'}
              </Text>
              <List size='sm' c='dimmed' pl='sm' my={0}>
                {!isLastHoldDetailedCancellation && (
                  <>
                    <List.Item>cancel all holds on chairs</List.Item>
                    <List.Item>remove all identifying information associated with a hold</List.Item>
                  </>
                )}
                {isLastHoldDetailedCancellation && (
                  <>
                    <List.Item>cancel this incident,</List.Item>
                    <List.Item>cancel the chair reservation, and</List.Item>
                    <List.Item>remove identifying information from hold.</List.Item>
                  </>
                )}
              </List>
              {!isLastHoldDetailedCancellation && (
                <Text size='sm' c='dimmed'>You will not be able to make future changes to this incident.</Text>
              )}
            </Stack>
          )}

          <CancelReasonSelector
            value={cancelReasonId}
            onChange={setCancelReasonId}
            enabled={requiresReason}
            label={reasonPrompt}
            stacked
          />
        </Stack>
        <Group grow>
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
            data-autofocus
            onClick={onClose}
            disabled={loading}
          >
            {keepLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default CancelIncidentModal;
