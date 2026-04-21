import { Alert, Anchor, Button, Card, Group, Loader, Stack, Title } from '@mantine/core';
import { IconAlertTriangle, IconTallymark1 } from '@tabler/icons-react';
import { inflect } from 'inflection';
import { useTranslation } from 'react-i18next';
import FacilityAddressLinkFromParts from '../../components/facilityAddressLink/FacilityAddressLinkFromParts';

function Facility ({
  facility,
  bedTypes,
  canArrive,
  canLeave,
  onArrivedClick,
  onLeftClick,
  isArrivalPending,
}) {
  const { t } = useTranslation();
  const placeholderPhone = '(415) 555-7890';
  const isClosed = facility.status === 'CLOSED';
  const isArrivedButtonDisabled = isArrivalPending || isClosed || !canArrive;
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
        <Group gap='sm' justify='center' wrap='nowrap'>
          {canArrive && (
            <Button
              size='lg'
              variant='secondary'
              onClick={onArrivedClick}
              disabled={isArrivedButtonDisabled}
            >
              {isArrivalPending ? <Loader size='sm' /> : "I've arrived"}
            </Button>
          )}
          {canLeave && (
            <Button
              size='lg'
              onClick={onLeftClick}
            >
              I've left
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default Facility;
