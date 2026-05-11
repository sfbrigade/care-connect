import React from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

function SafetyCheckResultModal ({
  deflectionId,
  facilityId,
  opened,
  onClose,
  onConfirmPassed,
  onConfirmFailed,
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const safetyCheckMutation = useMutation({
    mutationFn: () => Api.deflections.safetyCheck(deflectionId),
    onSuccess: () => {
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflectionId));
      queryClient.invalidateQueries({ queryKey: ['deflections', facilityId] });
      showToast('Safety check completed', 'success', 4000, 'Person is ready for medical intake.');
      onConfirmPassed();
    },
    onError: () => {
      showToast('Safety check not saved. Please try again.', 'error');
    },
  });

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
        <Stack gap='xs'>
          <Group justify='space-between' align='flex-start' wrap='nowrap'>
            <Title order={3}>Record safety check</Title>
            <ActionIcon
              onClick={onClose}
              bg='rgba(134, 142, 150, 0.1)'
              c='black'
              radius='xl'
              w={40}
              h={40}
              ml='auto'
              disabled={safetyCheckMutation.isPending}
              aria-label='Close'
              styles={{
                root: {
                  '&:focus': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                },
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <Text size='md'>Indicate a failed check if you have a safety concern that would require an exit to jail.</Text>
        </Stack>

        <Group gap='sm' justify='flex-start' wrap='nowrap' grow>
          <Button
            variant='destructive'
            onClick={onConfirmFailed}
            disabled={safetyCheckMutation.isPending}
          >
            Failed
          </Button>
          <Button
            onClick={() => safetyCheckMutation.mutate()}
            disabled={safetyCheckMutation.isPending}
          >
            Passed
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default SafetyCheckResultModal;
