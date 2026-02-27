import { Box, Stack, Text, Title } from '@mantine/core';

function EmptyState ({ title, description }) {
  return (
    <Stack align='center' gap='md' py='xl'>
      <Box
        w={160}
        h={160}
        style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-2)' }}
      />
      <Title order={3}>{title}</Title>
      <Text c='dimmed' ta='center'>{description}</Text>
    </Stack>
  );
}

export default EmptyState;
