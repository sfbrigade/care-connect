import { Container, Stack, Text, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Api from '../Api';
import Chip from '../Components/Chip';
import Card from '../Components/Card';
import { useState } from 'react';

/**
 * History view for holds - matches Figma "Availability Screen — History" design
 * Placeholder implementation
 */
function HoldsHistory () {
  const [filter, setFilter] = useState('thisWeek');

  const { data: holds, isLoading } = useQuery({
    queryKey: ['lesc-holds-history', filter],
    queryFn: async () => {
      const response = await Api.lesc.holds.list();
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

  const formatTimeRemaining = (expiresAt) => {
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - Date.now();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return 'Expired';
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimeUntil = (expiresAt) => {
    const expires = new Date(expiresAt);
    const displayHours = expires.getHours();
    const displayMinutes = expires.getMinutes();
    const ampm = displayHours >= 12 ? 'AM' : 'PM';
    const displayH = displayHours % 12 || 12;
    const displayM = displayMinutes.toString().padStart(2, '0');
    return `Until ${displayH}:${displayM} ${ampm}`;
  };

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
