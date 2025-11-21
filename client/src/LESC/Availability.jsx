import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Text, Stack, Group, Loader, Alert, Button, Modal, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router';
import { IconAlertCircle, IconLock, IconX, IconClock } from '@tabler/icons-react';

import Api from '../Api';
import LESCCard from '../Components/LESCCard';
import Chip from '../Components/Chip';
import Card from '../Components/Card';
import StatusBadge from '../Components/StatusBadge';

function Availability () {
  const navigate = useNavigate();
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
    mutationFn: ({ facilityId, serviceTypeId, notes, bedsRequested }) => 
      Api.lesc.holds.create({
        facilityId,
        serviceTypeId,
        bedsRequested: bedsRequested || 1,
        notes: notes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      setProcessingCard(null);
      setErrorCard(null);
      setNotes('');
      closeModal();
      // Navigate to success screen
      navigate('/lesc/success', {
        state: {
          holdData: data.data,
        },
      });
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
        bedsRequested: 1, // Default to 1 for modal (bed selector is in HoldForm)
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
        <Stack gap='md'>
          <LESCCard
            facilityName='LESC'
            address='No facilities available'
            bedCount={0}
            status='closed'
            intakeHours='24/7'
            lastUpdated={formatLastUpdated()}
          />
          <Alert>No LESC facilities found. Please ensure facilities are configured with LESC or SOBERING service types.</Alert>
        </Stack>
      </Container>
    );
  }

  // Get first facility for LESCCard (or aggregate if multiple)
  const primaryFacility = data && data.length > 0 ? data[0] : null;
  const totalBeds = data?.reduce((sum, item) => sum + (item.totalBeds || 0), 0) || 0;
  const totalAvailable = data?.reduce((sum, item) => sum + item.calculatedAvailable, 0) || 0;

  return (
    <Container>
      <Stack gap='md'>
        {/* LESCCard at top */}
        {primaryFacility && (
          <LESCCard
            facilityName={primaryFacility.facilityName}
            address={primaryFacility.facilityName} // Using facility name as placeholder for address
            bedCount={totalBeds || totalAvailable}
            status={totalAvailable > 0 ? 'open' : 'closed'}
            intakeHours='24/7'
            lastUpdated={formatLastUpdated()}
          />
        )}
        
        {/* Filter chips */}
        <Group gap='sm'>
          <Chip active={true}>Current holds</Chip>
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
                const diffMs = expiresAt.getTime() - Date.now();
                const diffMins = Math.floor(diffMs / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                const timeRemaining = diffMins < 60 ? `${diffMins}m` : `${hours}h ${mins}m`;
                const displayHours = expiresAt.getHours();
                const displayMinutes = expiresAt.getMinutes();
                const ampm = displayHours >= 12 ? 'PM' : 'AM';
                const displayH = displayHours % 12 || 12;
                const displayM = displayMinutes.toString().padStart(2, '0');
                const timeUntil = `Until ${displayH}:${displayM} ${ampm}`;
                
                return (
                  <Card
                    key={hold.id}
                    timeRemaining={timeRemaining}
                    timeUntil={timeUntil}
                    badgeStatus='active'
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
                          onClick={() => handleCancelHold(hold.id)}
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
        
        {/* Facility availability cards */}
        <Stack gap='md'>
          {data.map((item) => (
            <Card
              key={`${item.facilityId}-${item.serviceTypeId}`}
              title={item.facilityName}
              subtitle={item.serviceTypeName}
              badgeStatus={item.calculatedAvailable > 0 ? 'open' : 'expired'}
              details={`${item.calculatedAvailable} Available`}
              actions={
                <Button
                  leftSection={<IconLock size={18} />}
                  onClick={() => handleHoldClick(item)}
                  disabled={item.calculatedAvailable <= 0}
                  variant='light'
                >
                  Hold
                </Button>
              }
            />
          ))}
        </Stack>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={selectedCard ? `Create Hold - ${selectedCard.facilityName}` : 'Create Hold'}
        styles={{
          content: {
            borderRadius: '16px',
          },
        }}
      >
        <Stack gap='md'>
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
            styles={{
              input: {
                borderRadius: '16px',
              },
            }}
          />
          {errorCard && selectedCard && errorCard === `${selectedCard.facilityId}-${selectedCard.serviceTypeId}` && createHoldMutation.error?.response?.data?.error && (
            <Alert icon={<IconAlertCircle />} title='Error' color='red'>
              {createHoldMutation.error.response.data.error}
            </Alert>
          )}
          <Group justify='flex-end' mt='md' gap='sm'>
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

