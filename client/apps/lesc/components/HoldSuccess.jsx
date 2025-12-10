import { Container, Stack, Text, Group, Button, Box } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router';

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

  // Calculate minutes until expiration
  const now = new Date();
  const minutesUntilExpiration = Math.round((expiresAt.getTime() - now.getTime()) / (60 * 1000));

  return (
    <Container size='sm' py='md' px='md' style={{ position: 'relative', minHeight: '100vh' }}>
      <Stack
        gap='24px'
        align='center'
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 40px)',
          maxWidth: '335px',
        }}
      >
        {/* Circular placeholder */}
        <Box
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '99px',
            backgroundColor: '#f1f3f5',
            flexShrink: 0,
          }}
        />

        {/* Text content */}
        <Stack gap='12px' style={{ width: '100%' }}>
          <Text
            style={{
              fontSize: '24px',
              lineHeight: '32px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 700,
              color: '#000000',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Hold placed for {holdData.bedsRequested} {holdData.bedsRequested === 1 ? 'bed' : 'beds'}, expires in {minutesUntilExpiration} {minutesUntilExpiration === 1 ? 'minute' : 'minutes'} at {expiresTime}.
          </Text>

          <Text
            style={{
              fontSize: '18px',
              lineHeight: '28px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Do you want to enter data now?
          </Text>
        </Stack>

        {/* Buttons */}
        <Group gap='8px' justify='center' style={{ width: '100%' }}>
          <Button
            onClick={() => navigate('/lesc/holds')}
            style={{
              backgroundColor: '#dee2e6',
              color: '#000000',
              borderRadius: '24px',
              padding: '6px 20px',
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 400,
              flex: '0 1 auto',
            }}
          >
            Later
          </Button>
          <Button
            onClick={() => navigate('/lesc/intake', { state: { holdId: holdData.id } })}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '6px 20px',
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 400,
              flex: '0 1 auto',
            }}
          >
            Enter Data
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

export default HoldSuccess;
