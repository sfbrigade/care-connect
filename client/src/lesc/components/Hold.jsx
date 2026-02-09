import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';

import LockedQRCode from '@/components/LockedQRCode';
import { calculateAge, formatTime, formatTimeRemaining } from '@/utils/format';
import { isValidDeflection, isValidIncident } from '@/utils/validators';

function Hold ({
  incident,
  deflection,
  onCancelClick,
  onDetailsClick,
}) {
  const { t } = useTranslation();
  const displayId = String(deflection.id).padStart(6, '0');
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Let’s add subject details';
  const isActive = deflection.status === 'ACTIVE';
  const [now, setNow] = useState(DateTime.now());

  let subjectAge;
  if (deflection?.subject?.dateOfBirth) {
    subjectAge = calculateAge(deflection?.subject?.dateOfBirth);
  }
  const subjectDetails = [];
  if (subjectAge) {
    subjectDetails.push(`${subjectAge} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection?.subject?.sex}`));
  }

  const isNew = !deflection?.subjectId;
  const isCancelled = deflection.status === 'CANCELLED';
  const isExpiredStatus = deflection.status === 'EXPIRED';
  const minutesUntilExpiration = deflection?.expiresAt
    ? DateTime.fromISO(deflection.expiresAt).diff(now, 'minutes').minutes
    : null;
  const isExpired = isExpiredStatus || (isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 0);
  const isExpiringSoon = isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 10;
  const isValid = isValidDeflection(deflection);
  const isReadyForTransfer = isValidIncident(incident) && isValid;
  const isArrived = deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER';
  const transferUrl = `${window.location.origin}/transfer/${deflection.id}`;

  useEffect(() => {
    if (!deflection?.expiresAt || (!isActive && !isExpiredStatus) || isArrived) return undefined;

    setNow(DateTime.now());
    const intervalId = window.setInterval(() => {
      setNow(DateTime.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [isActive, isExpiredStatus, deflection?.expiresAt, isArrived]);

  return (
    <Card bg='white' p='xl' withBorder>
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group gap='xs'>
            <Text size='md' c='gray.6'>Hold {displayId}</Text>
            {!isNew && !isValid && !isCancelled && !isExpired && (
              <>
                <Text size='md' c='gray.6'>•</Text>
                <Text size='md' c='red.6'>Details incomplete</Text>
              </>
            )}
            {isCancelled && (
              <>
                <Text size='md' c='gray.6'>•</Text>
                <Text size='md' c='yellow.7'>Cancelled at {formatTime(deflection?.cancelledAt)}</Text>
              </>
            )}
            {isExpired && (
              <>
                <Text size='md' c='gray.6'>•</Text>
                <Text size='md' c='yellow.7'>Expired at {formatTime(deflection?.expiresAt)}</Text>
              </>
            )}
          </Group>
          <Box>
            <Title order={3}>{displayName}</Title>
            {subjectDetails.length > 0 && (
              <Text size='md'>
                {subjectDetails.join(', ')}
              </Text>
            )}
          </Box>
        </Stack>
        {isActive && isArrived && (
          <Group justify='center'>
            <LockedQRCode value={transferUrl} locked={!isValid} />
          </Group>
        )}
        {!(isNew && (isCancelled || isExpired)) && (
          <Group justify='space-between' wrap='nowrap'>
            {isActive && !isExpired && !isArrived
              ? (
                <Title order={3} c={isExpiringSoon ? 'red.6' : 'black'}>{formatTimeRemaining(deflection?.expiresAt) ?? ''}</Title>
                )
              : <Box />}
            {isNew && !isExpired && !isCancelled && (
              <Group gap='sm' wrap='nowrap'>
                <Button size='md' variant='light' color='red.6' onClick={onCancelClick}>Cancel</Button>
                <Button size='md' onClick={onDetailsClick}>Add Details</Button>
              </Group>
            )}
            {!isNew && !isValid && !isExpired && !isCancelled && (
              <Button size='md' onClick={onDetailsClick}>Finish Details</Button>
            )}
            {!isNew && (isValid || isCancelled || isExpired) && (
              <Button size='md' variant='secondary' onClick={onDetailsClick}>View Details</Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export default Hold;
