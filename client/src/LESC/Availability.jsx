import { useQuery } from '@tanstack/react-query';
import { Container, Title, Card, Text, Badge, Stack, Group, Loader, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import Api from '../Api';

function Availability () {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

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
          </Card>
        ))}
      </Stack>
    </Container>
  );
}

export default Availability;

