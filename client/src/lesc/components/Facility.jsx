import { Alert, Anchor, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconQrcode, IconQrcodeOff, IconTallymark1 } from '@tabler/icons-react';
import { inflect } from 'inflection';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import FacilityAddressLinkFromParts from '../../components/facilityAddressLink/FacilityAddressLinkFromParts';
import classes from './Facility.module.css';

function Facility ({
  facility,
  bedTypes,
  atFacility,
  arrivedAt,
  canArrive,
  canLeave,
  onArrivedClick,
  onLeftClick,
  isArrivalPending,
  transferCodeStatus,
}) {
  const { t } = useTranslation();
  const placeholderPhone = '(415) 555-7890';
  const isClosed = facility.status === 'CLOSED';
  const isArrivedButtonDisabled = isArrivalPending || isClosed || !canArrive;
  const isLeftButtonDisabled = isArrivalPending || !canLeave;
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
                  className={classes.contactLink}
                />
              )}
              {hasAddressParts && phoneNumber && <IconTallymark1 color='var(--mantine-color-gray-3)' size={20} />}
              {phoneNumber && (
                <Anchor href={`tel:${phoneNumber}`} className={classes.contactLink}>
                  {phoneNumber}
                </Anchor>
              )}
            </Group>
          )}
        </Stack>
        <Group gap='sm' justify='center' wrap='nowrap'>
          {!atFacility && (
            <Button
              data-testid='arrived-btn'
              size='lg'
              variant='secondary'
              onClick={onArrivedClick}
              disabled={isArrivedButtonDisabled}
            >
              {isArrivalPending ? <Loader size='sm' /> : "I've arrived"}
            </Button>
          )}
          {atFacility && (
            <Button
              data-testid='left-btn'
              size='lg'
              onClick={onLeftClick}
              disabled={isLeftButtonDisabled}
            >
              I've left
            </Button>
          )}
        </Group>
        {transferCodeStatus && (
          <Group data-testid='transfer-code-status' gap='sm' justify='center' wrap='nowrap'>
            {transferCodeStatus.icon === 'ready'
              ? <IconQrcode data-testid='transfer-code-status-icon' className={classes.statusIcon} size={20} stroke={1.75} />
              : <IconQrcodeOff data-testid='transfer-code-status-icon' className={classes.statusIcon} size={20} stroke={1.75} />}
            <Text size='md' className={classes.statusText}>
              {transferCodeStatus.label}
            </Text>
          </Group>
        )}
        {!transferCodeStatus && atFacility && arrivedAt && (
          <Text align='center' size='md' c='gray.5'>
            Arrived at {DateTime.fromISO(arrivedAt).toLocaleString(DateTime.TIME_SIMPLE)}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export default Facility;
