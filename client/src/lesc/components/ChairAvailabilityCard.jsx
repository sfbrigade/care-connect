import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconTallymark1 } from '@tabler/icons-react';
import { inflect } from 'inflection';

function ChairAvailabilityCard ({
  availableChairs,
  reservedCount,
  occupiedCount,
  actionLabel,
  onActionClick,
  actionDisabled = false,
}) {
  return (
    <Card bg='white' p='xl' w='100%' withBorder>
      <Stack gap='lg' align='center'>
        <Stack gap='xs' align='center' w='100%'>
          <Title order={3} fw={400} ta='center'>
            {availableChairs} {inflect('chair', availableChairs)} available
          </Title>
          <Group gap={4} justify='center' wrap='wrap'>
            <Text size='md' c='gray.6' ta='center'>
              {reservedCount} reserved
            </Text>
            <IconTallymark1 color='var(--mantine-color-gray-3)' size={20} />
            <Text size='md' c='gray.6' ta='center'>
              {occupiedCount} occupied
            </Text>
          </Group>
        </Stack>
        {actionLabel && (
          <Button
            variant='secondary'
            px='lg'
            onClick={onActionClick}
            disabled={actionDisabled}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

export default ChairAvailabilityCard;
