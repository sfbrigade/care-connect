import React, { useEffect, useState } from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

// Two-step confirmation for the intake decision. Step 1 asks whether the medical
// intake was completed. Answering "No" advances to step 2 — a second confirmation —
// before the destructive "return to Deputy" action fires, since that move is
// irreversible. The external API is unchanged (a single opened/onClose modal with
// onConfirmCompleted / onConfirmNotCompleted callbacks); the parent closes the modal
// on mutation success, so this component only tracks which step is showing.
function CompleteIntakeModal ({
  opened,
  onClose,
  onConfirmCompleted,
  onConfirmNotCompleted,
  loading = false,
}) {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'returnToDeputy'

  // Always start on step 1 when the modal (re)opens.
  useEffect(() => {
    if (opened) setStep('confirm');
  }, [opened]);

  const closeButton = (
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
  );

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
      {step === 'confirm'
        ? (
          <Stack gap='2xl'>
            <Stack gap='sm'>
              <Group justify='space-between' align='center' wrap='nowrap'>
                <Title order={4}>Confirm medical intake</Title>
                {closeButton}
              </Group>
              <Text size='sm' c='dimmed'>
                Were you able to complete the full medical intake for this person?
              </Text>
            </Stack>

            <Stack gap='sm' align='flex-start'>
              <Button
                data-testid='intake-confirm-btn'
                color='indigo'
                size='lg'
                radius='xl'
                h={48}
                px={24}
                onClick={onConfirmCompleted}
                loading={loading}
              >
                Yes, intake completed
              </Button>
              <Button
                variant='outline'
                color='red'
                size='lg'
                radius='xl'
                h={48}
                px={24}
                onClick={() => setStep('returnToDeputy')}
                disabled={loading}
              >
                No, return to Deputy
              </Button>
            </Stack>
          </Stack>
          )
        : (
          <Stack gap='2xl'>
            <Stack gap='sm'>
              <Group justify='space-between' align='center' wrap='nowrap'>
                <Title order={4}>Confirm return to Deputy</Title>
                {closeButton}
              </Group>
              <Text size='sm' c='dimmed'>
                This will mark medical intake as not completed and move this person back to Deputy review for release or exit. This is irreversible.
              </Text>
            </Stack>

            <Stack gap='sm' align='flex-start'>
              <Button
                variant='outline'
                color='indigo'
                size='lg'
                radius='xl'
                h={48}
                px={24}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                data-testid='intake-return-btn'
                color='red'
                size='lg'
                radius='xl'
                h={48}
                px={24}
                onClick={onConfirmNotCompleted}
                loading={loading}
              >
                Confirm return to Deputy
              </Button>
            </Stack>
          </Stack>
          )}
    </Modal>
  );
}

export default CompleteIntakeModal;
