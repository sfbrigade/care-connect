import { Alert, Card, Text, Title, Group, Button, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { inflect, pluralize } from 'inflection';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

function Facility ({
  facility,
  bedTypes,
  arrivedAt,
  leftAt,
  onArrivedClick,
  onLeftClick,
  onHoldClick,
}) {
  const { t } = useTranslation();
  const isFull = (bedTypes?.reduce((sum, bedType) => sum + bedType.available, 0) ?? 0) === 0;
  const hasArrived = !!arrivedAt;
  const hasLeft = !!leftAt;
  const isClosed = facility.status === 'CLOSED';
  const isHoldButtonDisabled = isClosed || isFull || (hasArrived && !hasLeft);

  return (
    <Card bg='white' p='xl' w='100%' withBorder>
      <Stack gap='lg'>
        {isClosed && <Alert title='This facility is temporarily closed' color='red.6' variant='light' icon={<IconAlertTriangle size={20} />} />}
        {!isClosed && isFull && <Alert title={`All ${pluralize(t(`bedType.${bedTypes?.[0].type}`).toLocaleLowerCase())} are currently held`} color='yellow.6' variant='light' icon={<IconAlertTriangle size={20} />} />}
        <Stack gap='xs'>
          {bedTypes?.map(bedType => (
            <Title key={bedType.id} order={3}>{bedType.available} {inflect(t(`bedType.${bedType.type}`).toLocaleLowerCase(), bedType.available)} available</Title>
          ))}
          <Text size='sm'>{facility.name} <Text span c='gray.5'>•</Text> {[facility.addressLine1, facility.addressLine2].filter(Boolean).join(', ')}</Text>
        </Stack>
        <Group gap='sm' grow wrap='nowrap'>
          {(!hasArrived || hasLeft) && <Button px='sm' variant='secondary' onClick={onArrivedClick} disabled={isClosed}>I've arrived</Button>}
          {hasArrived && !hasLeft && <Button px='sm' color='indigo.0' c='black' onClick={onLeftClick}>I've left</Button>}
          <Button px='sm' onClick={onHoldClick} disabled={isHoldButtonDisabled}>Hold a {t(`bedType.${bedTypes?.[0].type}`).toLocaleLowerCase()}</Button>
        </Group>
        {hasArrived && !hasLeft && <Text align='center' size='md' c='gray.5'>Arrived at {DateTime.fromJSDate(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
        {hasLeft && <Text align='center' size='md' c='gray.5'>Left at {DateTime.fromJSDate(leftAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
      </Stack>
    </Card>
  );
}

export default Facility;
