import { Chip, Group, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';

function CancelReasonSelector ({ value, onChange, enabled = true, stacked = false }) {
  const { data: cancelReasons } = useQuery({
    queryKey: ['deflectionCancelReasons'],
    queryFn: () => Api.deflections.cancelReasons.index().then(response => response.data),
    enabled,
  });

  if (!enabled) {
    return null;
  }

  return (
    <Stack gap='sm'>
      <Text size='md'>Select a reason for canceling the hold(s)</Text>
      <Chip.Group value={value} onChange={onChange}>
        {!stacked && (
          <Group gap='sm' align='flex-start'>
            {cancelReasons?.map(reason => (
              <Chip key={reason.id} value={reason.id} size='md'>
                {reason.name}
              </Chip>
            ))}
          </Group>
        )}
        {stacked && (
          <Stack gap='sm' align='flex-start'>
            {cancelReasons?.map(reason => (
              <Chip key={reason.id} value={reason.id} size='md'>
                {reason.name}
              </Chip>
            ))}
          </Stack>
        )}
      </Chip.Group>
    </Stack>
  );
}

export default CancelReasonSelector;
