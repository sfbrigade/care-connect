import { Stack, Text, Title } from '@mantine/core';

// Screen intro heading used across the SMS enrollment / verify / preferences
// screens: a small, gray secondary `label` above the larger, black primary
// `message` (per the Figma text hierarchy).
function ScreenHeading ({ label, message }) {
  return (
    <Stack gap={4}>
      <Text size='sm' c='dimmed'>{label}</Text>
      <Title order={4}>{message}</Title>
    </Stack>
  );
}

export default ScreenHeading;
