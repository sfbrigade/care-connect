import React from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ToastContext';
import Api from '@/Api';

function ExitToJailModal ({
  deflectionId,
  facilityId,
  opened,
  onClose,
  onConfirm,
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const exitToJailMutation = useMutation({
    mutationFn: () => Api.deflections.exitToJail(deflectionId),
    onSuccess: () => {
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflectionId));
      window.sessionStorage.setItem('custodyReleasedSectionTarget', 'TRANSFERRED_TO_JAIL');
      queryClient.invalidateQueries({ queryKey: ['deflections', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      showToast('Exit recorded', 'success', 4000, 'Person moved to "Transferred to jail" under "Released".');
      onConfirm();
    },
    onError: () => {
      showToast('Couldn\'t record exit', 'error', 4000, 'Please check your connection and try again.');
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
        <Stack gap='sm'>
          <Group justify='space-between' align='center' wrap='nowrap'>
            <Title order={4}>Confirm exit to jail</Title>
            <ActionIcon
              onClick={onClose}
              bg='rgba(134, 142, 150, 0.1)'
              c='black'
              radius='xl'
              w={40}
              h={40}
              ml='auto'
              disabled={exitToJailMutation.isPending}
              aria-label='Close'
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <Text size='sm' c='dimmed'>
            This step cannot be undone.
            <br />
            &bull; The person will not be recorded as released.
            <br />
            &bull; Property will be recorded as returned.
            <br />
            &bull; An 849(b) incident form will be prepared and sent to you and SFSO records.
            <br />
            &bull; The record will move to the &quot;Legally released&quot; tab, in the &quot;Transferred to jail&quot; section.
          </Text>
        </Stack>

        <Group gap='sm' justify='flex-start' wrap='wrap'>
          <Button
            variant='destructive'
            onClick={onClose}
            disabled={exitToJailMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => exitToJailMutation.mutate()}
            loading={exitToJailMutation.isPending}
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ExitToJailModal;
