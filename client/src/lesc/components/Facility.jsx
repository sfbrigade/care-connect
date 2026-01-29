import { Alert, Card, Text, Title, Group, Button, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { inflect } from 'inflection';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import FacilityAddressLink from '../../components/FacilityAddressLink';

function Facility ({
  facility,
  bedTypes,
  arrivedAt,
  leftAt,
  hasActiveHold,
  onArrivedClick,
  onLeftClick,
  onHoldClick,
}) {
  const { t } = useTranslation();
  const hasArrived = !!arrivedAt;
  const hasLeft = !!leftAt;
  const isClosed = facility.status === 'CLOSED';
  const isFull = (bedTypes?.reduce((sum, bedType) => sum + bedType.available, 0) ?? 0) === 0;
  const isHoldButtonDisabled = isClosed || isFull || (hasArrived && !hasLeft);
  const isArrivedButtonDisabled = isClosed || !hasActiveHold;
  const address = [facility.addressLine1, facility.addressLine2].filter(Boolean).join(', ');

  return (
    <Card bg='white' p='xl' w='100%' withBorder>
      <Stack gap='lg'>
        {isClosed && <Alert title='This facility is temporarily closed' color='red.6' variant='light' icon={<IconAlertTriangle size={20} />} />}
        <Stack gap='xs'>
          {bedTypes?.map(bedType => (
            <Title key={bedType.id} order={3} c={bedType.available === 0 ? 'red.6' : undefined}>{bedType.available} {inflect(t(`bedType.${bedType.type}`).toLocaleLowerCase(), bedType.available)} available</Title>
          ))}
          <Text size='sm'>
            {facility.name}
            {address && (
              <>
                {' '}
                <Text span c='gray.5'>•</Text>{' '}
                <FacilityAddressLink
                  address={address}
                />
              </>
            )}
          </Text>
        </Stack>
        <Group gap='sm' grow wrap='nowrap'>
          {(!hasArrived || hasLeft) && <Button px='sm' variant='secondary' onClick={onArrivedClick} disabled={isArrivedButtonDisabled}>I've arrived</Button>}
          {hasArrived && !hasLeft && <Button px='sm' color='indigo.0' c='black' onClick={onLeftClick}>I've left</Button>}
          <Button px='sm' onClick={onHoldClick} disabled={isHoldButtonDisabled}>Hold a {t(`bedType.${bedTypes?.[0].type}`).toLocaleLowerCase()}</Button>
        </Group>
        {hasArrived && !hasLeft && <Text align='center' size='md' c='gray.5'>Arrived at {DateTime.fromISO(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
        {hasLeft && <Text align='center' size='md' c='gray.5'>Left at {DateTime.fromISO(leftAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
      </Stack>
    </Card>
  );
}

export default Facility;
