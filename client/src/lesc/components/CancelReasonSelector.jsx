import { Chip, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

function CancelReasonSelector ({ value, onChange, enabled = true, stacked = false, label = 'Select a reason for canceling the hold(s)' }) {
  const { t } = useTranslation();
  const cancelReasons = Object.entries(t('deflectionCancelReason', { returnObjects: true }))
    .map(([id, name]) => ({ id, name }));

  if (!enabled) {
    return null;
  }

  return (
    <Stack gap='sm'>
      <Text size='md'>{label}</Text>
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
