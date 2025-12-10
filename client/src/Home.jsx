import { Container, Stack, Title, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useState } from 'react';

function Home () {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleLESCClick = () => {
    setSelected('lesc');
    navigate('/lesc');
  };

  const handleDIDOClick = () => {
    setSelected('dido');
    navigate('/dido');
  };

  return (
    <Container size='sm' py='xl'>
      <Stack align='center' gap='xl'>
        <Stack align='center' gap='md'>
          <Title order={1} size='2.5rem' ta='center'>CareConnectSF</Title>
          <Text size='lg' c='dimmed' ta='center'>Select an application</Text>
        </Stack>
        <Stack gap='md' align='center' style={{ width: '100%', maxWidth: '400px' }}>
          <Button
            onClick={handleLESCClick}
            variant={selected === 'lesc' ? 'filled' : 'light'}
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
            onClick={handleDIDOClick}
            variant={selected === 'dido' ? 'filled' : 'light'}
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

export default Home;
