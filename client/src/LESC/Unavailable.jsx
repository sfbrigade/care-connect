import { Container, Stack, Text, Title } from '@mantine/core';
import LESCCard from '../../core/components/LESCCard';

/**
 * Unavailable screen - shown when LESC has no availability
 * Matches Figma "Unavailable Screen" design
 */
function Unavailable () {
  const formatLastUpdated = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <Container>
      <Stack gap='md'>
        <LESCCard
          facilityName='LESC'
          address='123 Main St, San Francisco'
          bedCount={0}
          status='closed'
          intakeHours='24/7'
          lastUpdated={formatLastUpdated()}
        />

        <Stack gap='md' align='center' style={{ paddingTop: '40px' }}>
          <Title order={2}>No Availability</Title>
          <Text
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
              textAlign: 'center',
            }}
          >
            LESC is currently at full capacity. Please check back later.
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}

export default Unavailable;
