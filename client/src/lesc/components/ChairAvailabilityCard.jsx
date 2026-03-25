import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { inflect } from 'inflection';
import TallymarkSeparator from './TallymarkSeparator';

function ChairAvailabilityCard ({
  availableChairs,
  inTransitCount,
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
              {inTransitCount} in transit
            </Text>
            <TallymarkSeparator />
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
