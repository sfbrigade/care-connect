import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Text, Button, Stack, Group, Loader, Alert, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconPlus, IconClock, IconX } from '@tabler/icons-react';

import Api from '../Api';
import HoldForm from './HoldForm';
import Card from '../Components/Card';

function Holds () {
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const queryClient = useQueryClient();

  const { data: holds, isLoading, error } = useQuery({
    queryKey: ['lesc-holds'],
    queryFn: async () => {
      const response = await Api.lesc.holds.list();
      return response.data;
    },
  });

  const extendMutation = useMutation({
    mutationFn: (id) => Api.lesc.holds.extend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => Api.lesc.holds.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
    },
  });

  const handleExtend = (id) => {
    extendMutation.mutate(id);
  };

  const handleCancel = (id) => {
    if (confirm('Are you sure you want to cancel this hold?')) {
      cancelMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert icon={<IconAlertCircle />} title='Error' color='red'>
          Failed to load holds.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Group justify='space-between' mb='md'>
        <Title order={2}>Active Bed Holds</Title>
        <Button leftSection={<IconPlus />} onClick={openCreateModal}>
          Create Hold
        </Button>
      </Group>

      <Modal opened={createModalOpened} onClose={closeCreateModal} title='Create Bed Hold'>
        <HoldForm onSuccess={() => { closeCreateModal(); queryClient.invalidateQueries({ queryKey: ['lesc-holds'] }); queryClient.invalidateQueries({ queryKey: ['lesc-availability'] }); }} />
      </Modal>

      {holds && holds.length === 0 ? (
        <Alert>No active holds.</Alert>
      ) : (
        <Stack gap='md'>
          {holds?.map((hold) => {
            const expiresAt = new Date(hold.expiresAt);
            const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000;
            
            // Format time remaining
            const diffMs = expiresAt.getTime() - Date.now();
            const diffMins = Math.floor(diffMs / 60000);
            let timeRemaining;
            if (diffMins < 0) {
              timeRemaining = 'Expired';
            } else if (diffMins < 60) {
              timeRemaining = `${diffMins} mins`;
            } else {
              const hours = Math.floor(diffMins / 60);
              const mins = diffMins % 60;
              timeRemaining = `${hours}h ${mins}m`;
            }
            
            // Format time until
            const displayHours = expiresAt.getHours();
            const displayMinutes = expiresAt.getMinutes();
            const ampm = displayHours >= 12 ? 'AM' : 'AM';
            const displayH = displayHours % 12 || 12;
            const displayM = displayMinutes.toString().padStart(2, '0');
            const timeUntil = `Until ${displayH}:${displayM} ${ampm}`;

            return (
              <Card
                key={hold.id}
                timeRemaining={timeRemaining}
                timeUntil={timeUntil}
                badgeStatus={isExpiringSoon ? 'warning' : 'active'}
                details={hold.notes || 'Details/Notes ????'}
                actions={
                  <>
                    <Button
                      leftSection={<IconClock size={18} />}
                      variant='light'
                      size='sm'
                      onClick={() => handleExtend(hold.id)}
                      loading={extendMutation.isPending}
                    >
                      Extend 30 min
                    </Button>
                    <Button
                      leftSection={<IconX size={18} />}
                      variant='light'
                      color='red'
                      size='sm'
                      onClick={() => handleCancel(hold.id)}
                      loading={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </>
                }
              />
            );
          })}
        </Stack>
      )}
    </Container>
  );
}

export default Holds;

