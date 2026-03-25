import { Badge, Card, Loader, Text, Title, Group, Button, Stack } from '@mantine/core';
import { inflect } from 'inflection';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import FacilityAddressLinkFromParts from '../../components/facilityAddressLink/FacilityAddressLinkFromParts';

const STATUS_BADGES = {
  OPEN_NOT_ACCEPTING: { label: 'Not accepting new holds', color: 'red' },
  CLOSED: { label: 'Temporarily closed', color: 'red' },
};

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
  showAddress = false,
  showCounts = false,
}) {
  const { t } = useTranslation();
  const hasArrived = !!arrivedAt;
  const hasLeft = !!leftAt;
  const primaryBedType = bedTypes?.[0];
  const isClosed = facility.status === 'CLOSED';
  const isFull = (bedTypes?.reduce((sum, bedType) => sum + bedType.available, 0) ?? 0) === 0;
  const hasButtons = onHoldClick || onArrivedClick || onLeftClick;
  const isHoldButtonDisabled = isPending || isClosed || isFull || !primaryBedType || (hasArrived && !hasLeft);
  const isArrivedButtonDisabled = isPending || isClosed || !hasActiveHold;
  const hasAddressParts = showAddress && [
    facility.addressLine1,
    facility.addressLine2,
    facility.city,
    facility.state,
    facility.postalCode,
    facility.country,
  ].some(Boolean);

  const badge = STATUS_BADGES[facility.status];

  return (
    <Card bg='white' p='xl' w='100%' withBorder>
      <Stack gap='lg' align='center'>
        {badge && (
          <Badge color={badge.color} variant='light' size='lg'>
            {badge.label}
          </Badge>
        )}
        <Stack gap='xs' align='center'>
          {bedTypes?.map(bedType => (
            <Stack key={bedType.id} gap='xs' align='center'>
              <Title order={3} c={bedType.available === 0 ? 'red.6' : undefined}>{bedType.available} {inflect(t(`bedType.${bedType.type}`).toLocaleLowerCase(), bedType.available)} available</Title>
              {showCounts && (
                <Group gap='xs'>
                  <Text size='sm' c='dimmed'>{bedType.holds} in transit</Text>
                  <Text size='sm' c='dimmed'>|</Text>
                  <Text size='sm' c='dimmed'>{bedType.occupied} occupied</Text>
                </Group>
              )}
            </Stack>
          ))}
          {showAddress && (
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
          )}
        </Stack>
        {hasButtons && (
          <Group gap='sm' grow wrap='nowrap' w='100%'>
            {onArrivedClick && (!hasArrived || hasLeft) && <Button px='sm' variant='secondary' onClick={onArrivedClick} disabled={isArrivedButtonDisabled}>{isPending ? <Loader size='sm' /> : "I've arrived"}</Button>}
            {onLeftClick && hasArrived && !hasLeft && <Button px='sm' onClick={onLeftClick} disabled={hasActiveHold}>I've left</Button>}
            {onHoldClick && (
              <Button px='sm' onClick={onHoldClick} disabled={isHoldButtonDisabled}>
                Hold a {primaryBedType ? t(`bedType.${primaryBedType.type}`).toLocaleLowerCase() : 'bed'}
              </Button>
            )}
          </Group>
        )}
        {hasArrived && !hasLeft && <Text size='md' c='gray.5'>Arrived at {DateTime.fromISO(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
        {hasLeft && <Text size='md' c='gray.5'>Left at {DateTime.fromISO(leftAt).toLocaleString(DateTime.TIME_SIMPLE)}</Text>}
      </Stack>
    </Card>
  );
}

export default Facility;
