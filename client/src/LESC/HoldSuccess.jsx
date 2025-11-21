import { Container, Stack, Text, Group, Button } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router';
import Card from '../Components/Card';

/**
 * Hold Success screen - shown after successful hold creation
 * Matches Figma "Hold a Bed — Successful" design
 */
function HoldSuccess () {
  const navigate = useNavigate();
  const location = useLocation();
  const holdData = location.state?.holdData || {
    bedsRequested: 2,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  const expiresAt = new Date(holdData.expiresAt);
  const displayHours = expiresAt.getHours();
  const displayMinutes = expiresAt.getMinutes();
  const ampm = displayHours >= 12 ? 'PM' : 'AM';
  const displayH = displayHours % 12 || 12;
  const displayM = displayMinutes.toString().padStart(2, '0');
  const expiresTime = `${displayH}:${displayM} ${ampm}`;

  return (
    <Container>
      <Stack gap='md' align='center' style={{ paddingTop: '40px' }}>
        <div
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '16px',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          {/* Placeholder for success icon/area */}
          <Text size='xl'>✓</Text>
        </div>

        <Stack gap='md' style={{ width: '335px', textAlign: 'center' }}>
          <Text
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#212529',
            }}
          >
            Hold placed for {holdData.bedsRequested} {holdData.bedsRequested === 1 ? 'bed' : 'beds'}, expires in 60 minutes at {expiresTime}.
          </Text>

          <Text
            style={{
              fontSize: '18px',
              lineHeight: '28px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#000000',
            }}
          >
            Do you want to start the intake form now?
          </Text>

          <Group justify='center' gap='sm' mt='md'>
            <Button variant='light' onClick={() => navigate('/lesc/availability')}>
              No
            </Button>
            <Button onClick={() => navigate('/lesc/intake', { state: { holdId: holdData.id } })}>
              Yes
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Container>
  );
}

export default HoldSuccess;

