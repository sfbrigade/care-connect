import { Container, Title, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router';

function NotFound () {
  const navigate = useNavigate();

  return (
    <Container size='sm' py='xl' ta='center'>
      <Title order={1} size='3rem' mb='md'>404</Title>
      <Text size='lg' mb='xl'>Page not found</Text>
      <Button onClick={() => navigate('/dido')}>
        Go to DIDO App
      </Button>
    </Container>
  );
}

export default NotFound;
