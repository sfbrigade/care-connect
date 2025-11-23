import { Container, Stack, Text, Group, Button } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import Card from '../Components/Card';

/**
 * Check-in screen - matches Figma "Check-in" design
 * Placeholder implementation
 */
function CheckIn () {
  const navigate = useNavigate();
  const { holdId } = useParams();

  const { data: hold, isLoading } = useQuery({
    queryKey: ['lesc-hold', holdId],
    queryFn: async () => {
      // Placeholder - would fetch hold data
      return {
        id: holdId,
        facilityName: 'LESC',
        bedsRequested: 2,
        expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
      };
    },
    enabled: !!holdId,
  });

  if (isLoading) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!hold) {
    return (
      <Container>
        <Text>Hold not found</Text>
      </Container>
    );
  }

  const expiresAt = new Date(hold.expiresAt);
  const diffMs = expiresAt.getTime() - Date.now();
  const diffMins = Math.floor(diffMs / 60000);
  const timeRemaining = diffMins < 60 ? `${diffMins} mins` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  const displayHours = expiresAt.getHours();
  const displayMinutes = expiresAt.getMinutes();
  const ampm = displayHours >= 12 ? 'AM' : 'PM';
  const displayH = displayHours % 12 || 12;
  const displayM = displayMinutes.toString().padStart(2, '0');
  const timeUntil = `Until ${displayH}:${displayM} ${ampm}`;

  return (
    <Container>
      <Stack gap='md'>
        <Button
          leftSection={<IconArrowLeft size={18} />}
          variant='light'
          onClick={() => navigate(-1)}
          style={{ alignSelf: 'flex-start' }}
        >
          Back
        </Button>

        <div
          style={{
            width: '230px',
            height: '230px',
            borderRadius: '16px',
            backgroundColor: '#f8f9fa',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Placeholder for photo */}
          <Text size='lg' c='dimmed'>Photo</Text>
        </div>

        <Group justify='space-between' gap='sm'>
          <Button variant='light' onClick={() => navigate('/lesc/intake', { state: { holdId: hold.id } })}>
            Start Intake
          </Button>
          <Button variant='light' color='red' onClick={() => navigate('/lesc/holds')}>
            Cancel
          </Button>
        </Group>

        <Card
          timeRemaining={timeRemaining}
          timeUntil={timeUntil}
          badgeStatus='active'
        />

        <Text
          style={{
            fontSize: '16px',
            lineHeight: '24px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400,
            color: '#212529',
          }}
        >
          Details from form?
        </Text>

        <Button variant='light' onClick={() => navigate('/lesc/intake', { state: { holdId: hold.id } })}>
          View Details
        </Button>
      </Stack>
    </Container>
  );
}

export default CheckIn;
