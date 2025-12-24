import { Button, Container, Stack, Text, Title } from '@mantine/core';

import { useLocationContext } from './LocationContext';

function LocationSelector ({ children }) {
  const { location, setLocation } = useLocationContext();
  if (!location) {
    function onLESCClick () {
      setLocation({
        name: 'LESC',
        appType: 'lesc',
      });
    }

    function onDIDOClick () {
      setLocation({
        name: 'DIDO',
        appType: 'dido',
      });
    }

    return (
      <Container size='sm' py='xl'>
        <Stack align='center' gap='xl'>
          <Stack align='center' gap='md'>
            <Title order={1} size='2.5rem' ta='center'>CareConnectSF</Title>
            <Text size='lg' c='dimmed' ta='center'>Select an application</Text>
          </Stack>
          <Stack gap='md' align='center' style={{ width: '100%', maxWidth: '400px' }}>
            <Button
              onClick={onLESCClick}
              variant='light'
              color='blue'
              size='lg'
              fullWidth
              style={{
                borderRadius: '24px',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '24px',
              }}
            >
              LESC
            </Button>
            <Button
              onClick={onDIDOClick}
              variant='light'
              color='blue'
              size='lg'
              fullWidth
              style={{
                borderRadius: '24px',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '24px',
              }}
            >
              DIDO
            </Button>
          </Stack>
        </Stack>
      </Container>
    );
  }
  return children;
}

export default LocationSelector;
