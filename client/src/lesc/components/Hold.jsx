import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import { useQuery } from '@tanstack/react-query';
import LockedQRCode from '../../components/LockedQRCode';
import { calculateAge, formatTime, formatTimeRemaining } from '../../utils/format';
import { isValidDeflection } from '../../utils/validators';

import Api from '../../Api';

function Hold ({ incident, deflection, onCancelClick, onDetailsClick }) {
  const { t } = useTranslation();
  const displayId = String(deflection.id);
  const displayName =
    [
      deflection?.subject?.firstName,
      deflection?.subject?.middleInitial,
      deflection?.subject?.lastName,
    ]
      .filter(Boolean)
      .join(' ') || 'Let’s add subject details';
  const isActive = deflection.status === 'ACTIVE';
  const isCompleted = deflection.status === 'COMPLETED';
  const [now, setNow] = useState(DateTime.now());

  const subjectAge = deflection?.subject?.dateOfBirth
    ? calculateAge(deflection?.subject?.dateOfBirth)
    : null;
  const subjectDetails = [];
  if (subjectAge !== null) {
    subjectDetails.push(`${subjectAge} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection?.subject?.sex}`));
  }
  const subjectDetailsText = subjectDetails.length > 0
    ? subjectDetails.join(', ')
    : 'Age and gender missing';

  const isNew = !deflection?.subjectId;
  const isCancelled = deflection.status === 'CANCELLED';
  const isExpiredStatus = deflection.status === 'EXPIRED';
  const minutesUntilExpiration = deflection?.expiresAt
    ? DateTime.fromISO(deflection.expiresAt).diff(now, 'minutes').minutes
    : null;
  const isExpired = isExpiredStatus || (isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 0);
  const isExpiringSoon = isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 10;
  const isValid = isValidDeflection(deflection);
  const isArrived = deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER';
  const hasIncompleteDetails = isActive && !isNew && !isValid && !isCancelled && !isExpired;
  const completedAt = deflection?.completedAt ?? deflection?.transferredAt;
  const showFooter = isActive;
  const transferUrl = `${window.location.origin}/transfer/${deflection.id}`;

  const { data: cancelReason } = useQuery({
    queryKey: ['deflection-cancel-reasons', deflection.cancelReasonId],
    queryFn: () => Api.deflections.cancelReasons.get(deflection.cancelReasonId).then(response => response.data),
    enabled: !!deflection.cancelReasonId,
  });
  const cancelReasonLabel = cancelReason?.name;

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
      <Stack gap='2xl'>
        <Stack gap='sm'>
          <Group gap='xs'>
            <Text size='md' c='gray.6'>Hold {displayId}</Text>
            {hasIncompleteDetails && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='red.6'>Details incomplete</Text>
              </>
            )}
            {isCancelled && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='yellow.7'>Canceled at {formatTime(deflection?.cancelledAt)}{cancelReasonLabel ? ` (${cancelReasonLabel})` : ''}</Text>
              </>
            )}
            {isExpired && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='yellow.7'>Expired at {formatTime(deflection?.expiresAt)}</Text>
              </>
            )}
            {isCompleted && completedAt && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='teal.5'>Completed at {formatTime(completedAt)}</Text>
              </>
            )}
          </Group>
          <Box>
            <Title order={3}>{displayName}</Title>
            <Text size='md'>{subjectDetailsText}</Text>
          </Box>
        </Stack>
        {isActive && isArrived && (
          <Stack align='center' gap='xs'>
            <LockedQRCode value={transferUrl} locked={!isValid} />
            <Text size='sm' c='dimmed'>Transfer code: {deflection.id}</Text>
          </Stack>
        )}
        {showFooter && (
          <Group justify='space-between' wrap='nowrap'>
            {isActive && !isExpired && !isArrived
              ? (
                <Title order={3} c={isExpiringSoon ? 'red.6' : 'black'}>{formatTimeRemaining(deflection?.expiresAt) ?? ''}</Title>
                )
              : <Box />}
            {isNew && !isExpired && !isCancelled && (
              <Group gap='sm' wrap='nowrap'>
                <Button size='md' variant='destructive' onClick={onCancelClick}>Cancel</Button>
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
