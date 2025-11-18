import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Card, Text, Badge, Stack, Group, Loader, Alert, Button, Modal, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconLock, IconX, IconClock } from '@tabler/icons-react';

import Api from '../Api';

function Availability () {
  const queryClient = useQueryClient();
  const [processingCard, setProcessingCard] = useState(null);
  const [errorCard, setErrorCard] = useState(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [notes, setNotes] = useState('');
  
  const { data, isLoading, error } = useQuery({
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

  const createHoldMutation = useMutation({
    mutationFn: ({ facilityId, serviceTypeId, notes }) => 
      Api.lesc.holds.create({
        facilityId,
        serviceTypeId,
        bedsRequested: 1,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      setProcessingCard(null);
      setErrorCard(null);
      setNotes('');
      closeModal();
    },
    onError: () => {
      setProcessingCard(null);
    },
  });

  const handleHoldClick = (item) => {
    setSelectedCard(item);
    setNotes('');
    setErrorCard(null);
    openModal();
  };

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

  const handleCreateHold = () => {
    if (!selectedCard) return;
    const cardKey = `${selectedCard.facilityId}-${selectedCard.serviceTypeId}`;
    setProcessingCard(cardKey);
    createHoldMutation.mutate(
      { 
        facilityId: selectedCard.facilityId, 
        serviceTypeId: selectedCard.serviceTypeId,
        notes,
      },
      {
        onError: () => {
          setErrorCard(cardKey);
        },
      }
    );
  };

  const handleCancelHold = (holdId) => {
    if (confirm('Are you sure you want to cancel this hold?')) {
      cancelHoldMutation.mutate(holdId);
    }
  };

  const handleExtendHold = (holdId) => {
    extendHoldMutation.mutate(holdId);
  };

  // Get active holds for a specific facility/service type
  const getHoldsForCard = (facilityId, serviceTypeId) => {
    if (!holds) return [];
    return holds.filter(hold => 
      hold.facilityId === facilityId && hold.serviceTypeId === serviceTypeId
    );
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
          Failed to load availability data.
        </Alert>
      </Container>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Container>
        <Title order={2} mb='md'>LESC Bed Availability</Title>
        <Alert>No LESC facilities found. Please ensure facilities are configured with LESC or SOBERING service types.</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Title order={2} mb='md'>LESC Bed Availability</Title>
      <Stack gap='md'>
        {data.map((item) => (
          <Card key={`${item.facilityId}-${item.serviceTypeId}`} shadow='sm' padding='lg' radius='md' withBorder>
            <Group justify='space-between' mb='xs'>
              <Title order={3}>{item.facilityName}</Title>
              <Badge color={item.calculatedAvailable > 0 ? 'green' : 'red'} size='lg'>
                {item.calculatedAvailable} Available
              </Badge>
            </Group>
            <Text size='sm' c='dimmed' mb='md'>
              {item.serviceTypeName}
            </Text>
            <Group gap='xl'>
              <div>
                <Text size='xs' c='dimmed'>Total Beds</Text>
                <Text fw={700}>{item.totalBeds ?? 'N/A'}</Text>
              </div>
              <div>
                <Text size='xs' c='dimmed'>Available</Text>
                <Text fw={700}>{item.availableBeds ?? 'N/A'}</Text>
              </div>
              <div>
                <Text size='xs' c='dimmed'>Reserved</Text>
                <Text fw={700}>{item.reservedBeds ?? 'N/A'}</Text>
              </div>
              <div>
                <Text size='xs' c='dimmed'>Active Holds</Text>
                <Text fw={700}>{item.activeHolds}</Text>
              </div>
            </Group>
            <Group mt='md' justify='flex-end'>
              {getHoldsForCard(item.facilityId, item.serviceTypeId).map((hold) => (
                <Group key={hold.id} gap='xs'>
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
                    onClick={() => handleCancelHold(hold.id)}
                    loading={cancelHoldMutation.isPending}
                    variant='light'
                    color='red'
                    size='sm'
                  >
                    Cancel ({formatRemainingTime(hold.expiresAt)})
                  </Button>
                </Group>
              ))}
              <Button
                leftSection={<IconLock size={18} />}
                onClick={() => handleHoldClick(item)}
                disabled={item.calculatedAvailable <= 0}
                variant='light'
              >
                Hold
              </Button>
            </Group>
          </Card>
        ))}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={selectedCard ? `Create Hold - ${selectedCard.facilityName}` : 'Create Hold'}
      >
        <Stack>
          {selectedCard && (
            <Text size='sm' c='dimmed'>
              Service Type: {selectedCard.serviceTypeName}
            </Text>
          )}
          <Textarea
            label='Notes (optional)'
            placeholder='Add any notes about this hold...'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          {errorCard && selectedCard && errorCard === `${selectedCard.facilityId}-${selectedCard.serviceTypeId}` && createHoldMutation.error?.response?.data?.error && (
            <Alert icon={<IconAlertCircle />} title='Error' color='red'>
              {createHoldMutation.error.response.data.error}
            </Alert>
          )}
          <Group justify='flex-end' mt='md'>
            <Button variant='light' onClick={closeModal}>
              Cancel
            </Button>
            <Button
              leftSection={<IconLock size={18} />}
              onClick={handleCreateHold}
              loading={createHoldMutation.isPending}
            >
              Create Hold
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default Availability;

