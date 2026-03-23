import { Alert, Card, Loader, Text, Title, Group, Button, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { inflect } from 'inflection';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import FacilityAddressLinkFromParts from '../../components/facilityAddressLink/FacilityAddressLinkFromParts';

function Facility ({
  facility,
  bedTypes,
  arrivedAt,
  leftAt,
  hasActiveHold,
  onArrivedClick,
  onLeftClick,
  onHoldClick,
  isPending,
}) {
  const { t } = useTranslation();
  const hasArrived = !!arrivedAt;
  const hasLeft = !!leftAt;
  const primaryBedType = bedTypes?.[0];
  const isClosed = facility.status === 'CLOSED';
  const isFull = (bedTypes?.reduce((sum, bedType) => sum + bedType.available, 0) ?? 0) === 0;
  const isHoldButtonDisabled = isPending || isClosed || isFull || !primaryBedType || (hasArrived && !hasLeft);
  const isArrivedButtonDisabled = isPending || isClosed || !hasActiveHold;
  const hasAddressParts = [
    facility.addressLine1,
    facility.addressLine2,
    facility.city,
    facility.state,
    facility.postalCode,
    facility.country,
  ].some(Boolean);
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
            {hasAddressParts && (
              <>
                {' '}
                <Text span c='gray.5'>•</Text>{' '}
                <FacilityAddressLinkFromParts
                  addressLine1={facility.addressLine1}
                  addressLine2={facility.addressLine2}
                  city={facility.city}
                  state={facility.state}
                  postalCode={facility.postalCode}
                />
              </>
            )}
          </Text>
        </Stack>
        <Group gap='sm' grow wrap='nowrap'>
          {(!hasArrived || hasLeft) && <Button px='sm' variant='secondary' onClick={onArrivedClick} disabled={isArrivedButtonDisabled}>{isPending ? <Loader size='sm' /> : "I've arrived"}</Button>}
          {hasArrived && !hasLeft && <Button px='sm' onClick={onLeftClick} disabled={hasActiveHold}>I've left</Button>}
          <Button px='sm' onClick={onHoldClick} disabled={isHoldButtonDisabled}>
            Hold a {primaryBedType ? t(`bedType.${primaryBedType.type}`).toLocaleLowerCase() : 'bed'}
          </Button>
        </Group>
        {hasArrived && !hasLeft && <Text align='center' size='md' c='gray.5'>Arrived at {DateTime.fromISO(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
        {hasLeft && <Text align='center' size='md' c='gray.5'>Left at {DateTime.fromISO(leftAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
      </Stack>
    </Card>
  );
}

export default Facility;
