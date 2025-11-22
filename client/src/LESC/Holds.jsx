import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Text, Button, Stack, Group, Loader, Alert, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLocation } from 'react-router';
import { IconAlertCircle, IconPlus, IconClock, IconX } from '@tabler/icons-react';

import Api from '../Api';
import HoldForm from './HoldForm';
import Card from '../Components/Card';
import Chip from '../Components/Chip';

function Holds () {
  const location = useLocation();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const queryClient = useQueryClient();
  
  // Auto-open modal if navigating with facilityId
  useEffect(() => {
    if (location.state?.facilityId) {
      openCreateModal();
    }
  }, [location.state?.facilityId, openCreateModal]);

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

  // Format created date
  const formatCreatedAt = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      // Format as date
      const month = created.toLocaleString('default', { month: 'short' });
      const day = created.getDate();
      const year = created.getFullYear();
      const isCurrentYear = year === now.getFullYear();
      return isCurrentYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
    }
  };

  return (
    <Container size="sm" py="md" px="md">
      <Group justify='space-between' mb='md'>
        <Title order={2}>Active Bed Holds</Title>
        <Button leftSection={<IconPlus />} onClick={openCreateModal}>
          Create Hold
        </Button>
      </Group>

      {/* Filter chips */}
      <Group gap='sm' mb='md'>
        <Chip active={true}>Current holds</Chip>
        <Chip active={false}>This week</Chip>
        <Chip active={false}>History</Chip>
      </Group>

      <Modal 
        opened={createModalOpened} 
        onClose={closeCreateModal} 
        title='Create Bed Hold'
        size="auto"
        centered
        lockScroll
        styles={{
          content: {
            borderRadius: '16px',
            maxHeight: '90vh',
            maxWidth: '100vw',
          },
          body: {
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
            padding: '20px',
          },
        }}
      >
        <HoldForm 
          onSuccess={() => { 
            closeCreateModal(); 
            queryClient.invalidateQueries({ queryKey: ['lesc-holds'] }); 
            queryClient.invalidateQueries({ queryKey: ['lesc-availability'] }); 
          }} 
          initialFacilityId={location.state?.facilityId}
        />
      </Modal>

      {holds && holds.length === 0 ? (
        <Alert>No active holds.</Alert>
      ) : (
        <Stack gap='md'>
          {holds?.map((hold) => {
            const expiresAt = new Date(hold.expiresAt);
            const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000;

            return (
              <Card
                key={hold.id}
                title={hold.facilityName}
                subtitle={formatCreatedAt(hold.createdAt)}
                badgeStatus={isExpiringSoon ? 'warning' : 'active'}
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

