import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Card, Text, Button, Stack, Group, Loader, Alert, Badge, Modal, TextInput, NumberInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconPlus, IconClock, IconX } from '@tabler/icons-react';

import Api from '../Api';
import HoldForm from './HoldForm';

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
            const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000; // Less than 15 minutes

            return (
              <Card key={hold.id} shadow='sm' padding='lg' radius='md' withBorder>
                <Group justify='space-between' mb='xs'>
                  <div>
                    <Title order={4}>{hold.facilityName}</Title>
                    <Text size='sm' c='dimmed'>{hold.serviceTypeName}</Text>
                  </div>
                  <Badge color={isExpiringSoon ? 'yellow' : 'blue'} size='lg'>
                    {hold.bedsRequested} {hold.bedsRequested === 1 ? 'Bed' : 'Beds'}
                  </Badge>
                </Group>
                <Group gap='xl' mb='md'>
                  <div>
                    <Text size='xs' c='dimmed'>Expires</Text>
                    <Text fw={700}>
                      {(() => {
                        const diffMs = expiresAt.getTime() - Date.now();
                        const diffMins = Math.floor(diffMs / 60000);
                        if (diffMins < 0) return 'Expired';
                        if (diffMins < 60) return `in ${diffMins} min`;
                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        return `in ${hours}h ${mins}m`;
                      })()}
                    </Text>
                  </div>
                  <div>
                    <Text size='xs' c='dimmed'>Status</Text>
                    <Text fw={700}>{hold.status}</Text>
                  </div>
                  {hold.notes && (
                    <div>
                      <Text size='xs' c='dimmed'>Notes</Text>
                      <Text size='sm'>{hold.notes}</Text>
                    </div>
                  )}
                </Group>
                <Group>
                  <Button
                    leftSection={<IconClock />}
                    variant='light'
                    onClick={() => handleExtend(hold.id)}
                    loading={extendMutation.isPending}
                  >
                    Extend 30 min
                  </Button>
                  <Button
                    leftSection={<IconX />}
                    variant='light'
                    color='red'
                    onClick={() => handleCancel(hold.id)}
                    loading={cancelMutation.isPending}
                  >
                    Cancel
                  </Button>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}

export default Holds;

