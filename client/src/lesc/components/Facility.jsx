import { Alert, Anchor, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconTallymark1 } from '@tabler/icons-react';
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
  const placeholderPhone = '(415) 555-7890';
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
  const phoneNumber = facility.phone || placeholderPhone;
  const hasLocationDetails = hasAddressParts || !!phoneNumber;
  const contactLinkStyles = {
    color: 'var(--mantine-color-indigo-6)',
    textAlign: 'center',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: '24px',
  };

  return (
    <Card bg='white' p='xl' w='100%' withBorder>
      <Stack gap='lg'>
        {isClosed && <Alert title='This facility is temporarily closed' color='red.6' variant='light' icon={<IconAlertTriangle size={20} />} />}
        <Stack gap='xs' align='center'>
          {bedTypes?.map(bedType => (
            <Title
              key={bedType.id}
              order={3}
              fw={400}
              ta='center'
              c={bedType.available === 0 ? 'red.6' : undefined}
            >
              {bedType.available} {inflect(t(`bedType.${bedType.type}`).toLocaleLowerCase(), bedType.available)} available
            </Title>
          ))}
          {hasLocationDetails && (
            <Group gap={4} justify='center' wrap='wrap'>
              {hasAddressParts && (
                <FacilityAddressLinkFromParts
                  addressLine1={facility.addressLine1}
                  addressLine2={facility.addressLine2}
                  city={facility.city}
                  state={facility.state}
                  postalCode={facility.postalCode}
                  style={contactLinkStyles}
                />
              )}
              {hasAddressParts && phoneNumber && <IconTallymark1 color='var(--mantine-color-gray-3)' size={20} />}
              {phoneNumber && (
                <Anchor href={`tel:${phoneNumber}`} style={contactLinkStyles}>
                  {phoneNumber}
                </Anchor>
              )}
            </Group>
          )}
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
