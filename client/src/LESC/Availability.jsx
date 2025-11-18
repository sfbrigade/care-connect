import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Card, Text, Badge, Stack, Group, Loader, Alert, Button } from '@mantine/core';
import { IconAlertCircle, IconLock } from '@tabler/icons-react';

import Api from '../Api';

function Availability () {
  const queryClient = useQueryClient();
  const [processingCard, setProcessingCard] = useState(null);
  const [errorCard, setErrorCard] = useState(null);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  const createHoldMutation = useMutation({
    mutationFn: ({ facilityId, serviceTypeId }) => 
      Api.lesc.holds.create({
        facilityId,
        serviceTypeId,
        bedsRequested: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      setProcessingCard(null);
      setErrorCard(null);
    },
    onError: () => {
      setProcessingCard(null);
    },
  });

  const handleCreateHold = (facilityId, serviceTypeId) => {
    const cardKey = `${facilityId}-${serviceTypeId}`;
    setProcessingCard(cardKey);
    setErrorCard(null);
    createHoldMutation.mutate(
      { facilityId, serviceTypeId },
      {
        onError: () => {
          setErrorCard(cardKey);
        },
      }
    );
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
              <Button
                leftSection={<IconLock size={18} />}
                onClick={() => handleCreateHold(item.facilityId, item.serviceTypeId)}
                disabled={item.calculatedAvailable <= 0}
                loading={processingCard === `${item.facilityId}-${item.serviceTypeId}`}
                variant='light'
              >
                Hold
              </Button>
            </Group>
            {errorCard === `${item.facilityId}-${item.serviceTypeId}` && createHoldMutation.error?.response?.data?.error && (
              <Alert icon={<IconAlertCircle />} title='Error' color='red' mt='md'>
                {createHoldMutation.error.response.data.error}
              </Alert>
            )}
          </Card>
        ))}
      </Stack>
    </Container>
  );
}

export default Availability;

