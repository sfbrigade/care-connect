import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Button, Stack, Group, Loader, Alert, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLocation } from 'react-router';
import { IconAlertCircle, IconPlus, IconClock, IconX } from '@tabler/icons-react';

import Api from '../../../core/Api';
import HoldForm from './HoldForm';
import CancelHoldModal from './CancelHoldModal';
import Card from '../../../core/components/Card';
import Chip from '../../../core/components/Chip';
import { formatCreatedAt } from '../../../core/utils/dateTime';

function Holds () {
  const location = useLocation();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);
  const [selectedHold, setSelectedHold] = useState(null);
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

  const handleCancel = (hold) => {
    setSelectedHold(hold);
    openCancelModal();
  };

  const handleConfirmCancel = () => {
    if (selectedHold) {
      cancelMutation.mutate(selectedHold.id, {
        onSuccess: () => {
          closeCancelModal();
          setSelectedHold(null);
        },
      });
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
    <Container size='sm' py='md' px='md'>
      <Group justify='space-between' mb='md'>
        <Title order={2}>Active Bed Holds</Title>
        <Button leftSection={<IconPlus />} onClick={openCreateModal}>
          Create Hold
        </Button>
      </Group>

      {/* Filter chips */}
      <Group gap='sm' mb='md'>
        <Chip active>Current holds</Chip>
        <Chip active={false}>This week</Chip>
        <Chip active={false}>History</Chip>
      </Group>

      <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title='Create Bed Hold'
        size='auto'
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

      <CancelHoldModal
        opened={cancelModalOpened}
        onClose={() => {
          closeCancelModal();
          setSelectedHold(null);
        }}
        onConfirm={handleConfirmCancel}
        holdIdentifier={selectedHold?.id?.slice(0, 8).toUpperCase() || '001'}
        holdName={selectedHold?.notes || selectedHold?.facilityName || 'this hold'}
        loading={cancelMutation.isPending}
      />

      {holds && holds.length === 0
        ? (
          <Alert>No active holds.</Alert>
          )
        : (
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
                        onClick={() => handleCancel(hold)}
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
