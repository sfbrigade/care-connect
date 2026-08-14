import { Stack, Text, Title } from '@mantine/core';

// Screen intro heading component: a small, gray secondary `label`
// above the larger, black primary `message`
function ScreenHeading ({ label, message }) {
  return (
    <Stack gap={4}>
      <Text size='xl' c='dimmed'>{label}</Text>
      <Title order={3}>{message}</Title>
    </Stack>
  );
}

export default ScreenHeading;
