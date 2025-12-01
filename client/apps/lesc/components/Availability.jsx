import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Stack, Group, Loader, Button, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLock, IconX, IconClock } from '@tabler/icons-react';

import Api from '../../../core/Api';
import Chip from '../../../core/components/Chip';
import Card from '../../../core/components/Card';
import HoldForm from './HoldForm';
import CancelHoldModal from './CancelHoldModal';
import { formatTime } from '../../../core/utils/dateTime';

function Availability () {
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);
  const [selectedHold, setSelectedHold] = useState(null);

  const { isLoading } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  const { data: holds } = useQuery({
    queryKey: ['lesc-holds'],
    queryFn: async () => {
      const response = await Api.lesc.holds.list();
      return response.data;
    },
  });

  const cancelHoldMutation = useMutation({
    mutationFn: (holdId) => Api.lesc.holds.cancel(holdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
    },
  });

  const extendHoldMutation = useMutation({
    mutationFn: (holdId) => Api.lesc.holds.extend(holdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
    },
  });

  const handleCancelHold = (hold) => {
    setSelectedHold(hold);
    openCancelModal();
  };

  const handleConfirmCancel = () => {
    if (selectedHold) {
      cancelHoldMutation.mutate(selectedHold.id, {
        onSuccess: () => {
          closeCancelModal();
          setSelectedHold(null);
        },
      });
    }
  };

  const handleExtendHold = (holdId) => {
    extendHoldMutation.mutate(holdId);
  };

  /*
  // Get active holds for a specific facility/service type
  const getHoldsForCard = (facilityId, serviceTypeId) => {
    if (!holds) return [];
    const now = new Date();
    return holds.filter(hold => {
      // Filter by facility and service type
      if (hold.facilityId !== facilityId || hold.serviceTypeId !== serviceTypeId) {
        return false;
      }
      // Filter out expired holds
      const expiresAt = new Date(hold.expiresAt);
      if (expiresAt <= now) {
        return false;
      }
      // Filter out EXPIRED status holds
      if (hold.status === 'EXPIRED' || hold.status === 'CANCELLED') {
        return false;
      }
      return true;
    });
  };

  // Format remaining time for a hold
  const formatRemainingTime = (expiresAt) => {
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - Date.now();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return 'Expired';
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Format last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };
  */

  if (isLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  return (
    <Container>
      <Stack gap='md'>
        {/* Filter chips */}
        <Group gap='sm'>
          <Chip active>Current holds</Chip>
          <Chip active={false}>This week</Chip>
          <Chip active={false}>History</Chip>
        </Group>

        {/* Active holds cards */}
        {holds && holds.length > 0 && (
          <Stack gap='md'>
            {holds
              .filter(hold => {
                const expiresAt = new Date(hold.expiresAt);
                return expiresAt > new Date() && hold.status !== 'EXPIRED' && hold.status !== 'CANCELLED';
              })
              .map((hold) => {
                const expiresAt = new Date(hold.expiresAt);
                const createdAt = new Date(hold.createdAt);
                const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000;

                const createdTime = formatTime(createdAt);
                const expiresTime = formatTime(expiresAt);
                const subtitle = `Created at ${createdTime}, expires at ${expiresTime}`;

                return (
                  <Card
                    key={hold.id}
                    title={hold.facilityName}
                    subtitle={subtitle}
                    badgeStatus={isExpiringSoon ? 'warning' : 'active'}
                    details={hold.notes || 'Details/Notes ????'}
                    actions={
                      <>
                        <Button
                          leftSection={<IconClock size={18} />}
                          onClick={() => handleExtendHold(hold.id)}
                          loading={extendHoldMutation.isPending}
                          variant='light'
                          size='sm'
                        >
                          Extend 30 min
                        </Button>
                        <Button
                          leftSection={<IconX size={18} />}
                          onClick={() => handleCancelHold(hold)}
                          loading={cancelHoldMutation.isPending}
                          variant='light'
                          color='red'
                          size='sm'
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

        {/* Create Hold button */}
        <Button
          leftSection={<IconLock size={18} />}
          onClick={openModal}
          fullWidth
          size='lg'
          mt='md'
        >
          Create Hold
        </Button>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title='Create Hold'
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
            closeModal();
            queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
            queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
          }}
          onCancel={closeModal}
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
        loading={cancelHoldMutation.isPending}
      />
    </Container>
  );
}

export default Availability;
