import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import LockedQRCode from '@/components/LockedQRCode';
import useNow from '@/hooks/useNow';
import { calculateAge, formatTime, formatTimeRemaining } from '@/utils/format';
import { isValidDeflection } from '@/utils/validators';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import { isCustodyTransferredStatus, isExpiredBeforeTransfer } from './deflectionStatusChipUtils';

function Hold ({ incident, deflection, highlighted, onCancelClick, onDetailsClick }) {
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
  if (subjectDetails.length === 0) {
    subjectDetails.push('Age and sex missing');
  }

  const isNew = !deflection?.subjectId;
  const isCancelled = deflection.status === 'CANCELLED';
  const isExpiredStatus = deflection.status === 'EXPIRED';
  const expiresAt = deflection?.expiresAt;
  const isValid = isValidDeflection(deflection);
  const isArrived = deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER';

  const timerEnabled = !!expiresAt && (isActive || isExpiredStatus) && !isArrived;
  const now = useNow(1000, timerEnabled);
  const minutesUntilExpiration = expiresAt
    ? DateTime.fromISO(expiresAt).diff(now, 'minutes').minutes
    : null;
  const isExpired = isExpiredBeforeTransfer(deflection, now);
  const isExpiringSoon = isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 10;
  const isCustodyTransferred = isCustodyTransferredStatus(deflection?.subjectStatus);
  const hasIncompleteDetails = isActive && !isNew && !isValid && !isCancelled && !isExpired;
  const transferredAt = deflection?.transferredAt;
  const canViewDetails = !isNew && !!onDetailsClick && (isValid || isCancelled || isExpired || isCustodyTransferred);
  const canFinishDetails = isActive && !isNew && !isValid && !isExpired && !isCancelled;
  const canAddDetails = isActive && isNew && !isExpired && !isCancelled;
  const showFooter = isActive || canViewDetails;
  const transferUrl = `${window.location.origin}/transfer/${deflection.id}`;

  const { data: cancelReason } = useQuery({
    queryKey: ['deflection-cancel-reasons', deflection.cancelReasonId],
    queryFn: () => Api.deflections.cancelReasons.get(deflection.cancelReasonId).then(response => response.data),
    enabled: !!deflection.cancelReasonId,
  });
  const cancelReasonLabel = cancelReason?.name;

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
                <Text size='md' c='red.6'>Canceled after expiry</Text>
              </>
            )}
            {isCustodyTransferred && transferredAt && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='teal.5'>Transferred at {formatTime(transferredAt)}</Text>
              </>
            )}
          </Group>
          <Box>
            <Title order={3}>{displayName}</Title>
            {subjectDetails.length > 0 && (
              <Text size='md'>{subjectDetails.join(', ')}</Text>
            )}
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
            {isExpired
              ? <Title order={4}>Expired</Title>
              : isActive && !isArrived && !isCustodyTransferred
                ? (
                  <Title
                    order={4}
                    c={isExpiringSoon ? 'red.6' : (highlighted ? undefined : 'black')}
                    style={isExpiringSoon ? undefined : highlighted ? { animation: 'textHighlight 3s ease-out' } : undefined}
                  >
                    {formatTimeRemaining(expiresAt, now) ?? ''}
                  </Title>
                  )
                : <Box />}
            {canAddDetails && (
              <Group gap='sm' wrap='nowrap'>
                <Button size='md' variant='destructive' onClick={onCancelClick}>Cancel</Button>
                <Button size='md' onClick={onDetailsClick}>Add Details</Button>
              </Group>
            )}
            {canFinishDetails && (
              <Button size='md' onClick={onDetailsClick}>Finish Details</Button>
            )}
            {canViewDetails && (
              <Button size='md' variant='secondary' onClick={onDetailsClick}>View Details</Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export default Hold;
