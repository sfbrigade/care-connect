import { Box, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';

import { formatTime } from '@/utils/format';

function EmptyState ({ title, description, updatedAt }) {
  return (
    <Stack align='center' gap='md' py='xl'>
      <Box
        w={160}
        h={160}
        style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-2)' }}
      />
      <Title order={3}>{title}</Title>
      <Text c='dimmed' ta='center'>{description}</Text>
      {updatedAt > 0 && (
        <Text size='sm' c='dimmed'>Updated at {formatTime(DateTime.fromMillis(updatedAt).toISO())}</Text>
      )}
    </Stack>
  );
}

export default EmptyState;
