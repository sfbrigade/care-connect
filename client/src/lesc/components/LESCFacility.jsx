import { Alert, Card, Text, Title, Group, Button, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { pluralize, singularize } from 'inflection';
import { DateTime } from 'luxon';

/**
 * LESCFacility component for displaying LESC facility-level information
 * Matches Figma design: https://www.figma.com/design/Q8kS4FJXh1TbbM8eDR7Z6Y/CareConnect?node-id=902-14464&m=dev
 */
function LESCFacility ({
  facilityName = 'RESET',
  address = '123 Main St',
  bedCount = 10,
  bedType = 'chair',
  isClosed = false,
  arrivedAt,
  leftAt,
  onArrivedClick,
  onLeftClick,
  onHoldClick,
}) {
  const isFull = bedCount === 0;
  const hasArrived = !!arrivedAt;
  const hasLeft = !!leftAt;
  const isHoldButtonDisabled = isClosed || isFull || (hasArrived && !hasLeft);

  return (
    <Card bg='white' p='xl' w='100%' withBorder>
      <Stack gap='lg'>
        {isClosed && <Alert title='This facility is temporarily closed' color='red.6' variant='light' icon={<IconAlertTriangle size={20} />} />}
        {!isClosed && isFull && <Alert title={`All ${pluralize(bedType)} are currently held`} color='yellow.6' variant='light' icon={<IconAlertTriangle size={20} />} />}
        <Stack gap='xs'>
          <Title order={3}>{bedCount} {bedCount === 1 ? singularize(bedType) : pluralize(bedType)} available</Title>
          <Text size='sm'>{facilityName} <Text span c='gray.5'>•</Text> {address}</Text>
        </Stack>
        <Group gap='sm' grow wrap='nowrap'>
          {(!hasArrived || hasLeft) && <Button px='sm' variant='secondary' onClick={onArrivedClick} disabled={isClosed}>I've arrived</Button>}
          {hasArrived && !hasLeft && <Button px='sm' color='indigo.0' c='black' onClick={onLeftClick}>I've left</Button>}
          <Button px='sm' onClick={onHoldClick} disabled={isHoldButtonDisabled}>Hold a {singularize(bedType)}</Button>
        </Group>
        {hasArrived && !hasLeft && <Text align='center' size='md' c='gray.5'>Arrived at {DateTime.fromJSDate(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
        {hasLeft && <Text align='center' size='md' c='gray.5'>Left at {DateTime.fromJSDate(leftAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
      </Stack>
    </Card>
  );
}

export default LESCFacility;
