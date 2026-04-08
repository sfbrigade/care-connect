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
  isArrivalPending,
}) {
  const { t } = useTranslation();
  const hasArrived = !!arrivedAt;
  const hasLeft = !!leftAt;
  const isClosed = facility.status === 'CLOSED';
  const isArrivedButtonDisabled = isArrivalPending || isClosed || !hasActiveHold;
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
        <Group gap='sm' justify='center' wrap='nowrap'>
          {(!hasArrived || hasLeft) && (
            <Button
              size='lg'
              variant='secondary'
              onClick={onArrivedClick}
              disabled={isArrivedButtonDisabled}
            >
              {isArrivalPending ? <Loader size='sm' /> : "I've arrived"}
            </Button>
          )}
          {hasArrived && !hasLeft && (
            <Button
              size='lg'
              onClick={onLeftClick}
              disabled={hasActiveHold}
            >
              I've left
            </Button>
          )}
        </Group>
        {hasArrived && !hasLeft && <Text align='center' size='md' c='gray.5'>Arrived at {DateTime.fromISO(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
        {hasLeft && <Text align='center' size='md' c='gray.5'>Left at {DateTime.fromISO(leftAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
      </Stack>
    </Card>
  );
}

export default Facility;
