import { Container, Stack, Text, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Api from '@/Api';
import Chip from '@/components/Chip';
import Card from '@/components/Card';
import { useState } from 'react';
import { formatTimeRemaining, formatTimeUntil } from '@/utils/dateTime';

/**
 * History view for holds - matches Figma "Availability Screen — History" design
 * Placeholder implementation
 */
function HoldsHistory () {
  const [filter, setFilter] = useState('thisWeek');

  const { data: holds, isLoading } = useQuery({
    queryKey: ['lesc-holds-history', filter],
    queryFn: async () => {
      const response = await Api.holds.list();
      // Filter to historical holds (expired or cancelled)
      return response.data.filter(hold => {
        const expiresAt = new Date(hold.expiresAt);
        return expiresAt < new Date() || hold.status === 'EXPIRED' || hold.status === 'CANCELLED';
      });
    },
  });

  if (isLoading) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container>
      <Stack gap='md'>
        <Group gap='sm'>
          <Chip active={filter === 'current'} onClick={() => setFilter('current')}>
            Current holds
          </Chip>
          <Chip active={filter === 'thisWeek'} onClick={() => setFilter('thisWeek')}>
            This week
          </Chip>
        </Group>

        {holds && holds.length === 0
          ? (
            <Text c='dimmed' ta='center' py='xl'>
              No historical holds found.
            </Text>
            )
          : (
            <Stack gap='md'>
              {holds?.map((hold) => (
                <Card
                  key={hold.id}
                  timeRemaining={formatTimeRemaining(hold.expiresAt)}
                  timeUntil={formatTimeUntil(hold.expiresAt)}
                  badgeStatus={hold.status === 'EXPIRED' || hold.status === 'CANCELLED' ? 'expired' : 'active'}
                  details={hold.notes || 'Details/Notes ????'}
                />
              ))}
            </Stack>
            )}
      </Stack>
    </Container>
  );
}

export default HoldsHistory;
