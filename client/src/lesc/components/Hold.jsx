import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';
import LockedQRCode from '@/components/LockedQRCode';
import useNow from '@/hooks/useNow';
import useSubjectDetails from '@/hooks/useSubjectDetails';
import { formatTime, formatTimeRemaining } from '@/utils/format';
import { isValidDeflection, isValidIncident } from '@/utils/validators';
import checkerboardEmptyState from '@/assets/icons/checkerboard-empty-state.svg';

import { isCustodyTransferredStatus, isExpiredBeforeTransfer } from './deflectionStatusChipUtils';

function Hold ({ incident, deflection, highlighted, onCancelClick, onDetailsClick, isHistory = false, isHandedOff = false }) {
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

  const rawSubjectDetails = useSubjectDetails(deflection?.subject);
  const subjectDetails = rawSubjectDetails.length > 0 ? rawSubjectDetails : ['Age and sex missing'];

  const isNew = !deflection?.subjectId;
  const isCancelled = deflection.status === 'CANCELLED';
  const isExpiredStatus = deflection.status === 'EXPIRED';
  const expiresAt = deflection?.expiresAt;
  const isValid = isValidDeflection(deflection);
  const isArrived = deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER';

  const timerEnabled = !!expiresAt && (isActive || isExpiredStatus) && !isArrived && !isHandedOff;
  const now = useNow(1000, timerEnabled);
  const minutesUntilExpiration = expiresAt
    ? DateTime.fromISO(expiresAt).diff(now, 'minutes').minutes
    : null;
  const isExpired = isExpiredBeforeTransfer(deflection, now);
  const isExpiringSoon = isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 10;
  const isCustodyTransferred = isCustodyTransferredStatus(deflection?.subjectStatus);
  const hasIncompleteDetails = isActive && !isNew && !isValid && !isCancelled && !isExpired;
  const canViewDetails = !isNew && !!onDetailsClick && (isValid || isCancelled || isExpired || isCustodyTransferred || isHandedOff);
  const canFinishDetails = isActive && !isNew && !isValid && !isExpired && !isCancelled && !isHistory;
  const canAddDetails = isActive && isNew && !isExpired && !isCancelled && !isHistory;
  const showFooter = canAddDetails || canFinishDetails || canViewDetails;
  const transferUrl = `${window.location.origin}/transfer/${deflection.id}`;

  const cancelReasonLabel = deflection?.cancelReason?.name ?? deflection?.cancelReason;

  return (
    <Card bg='white' p='md' withBorder>
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
            {isHandedOff && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='indigo.6'>Handed off</Text>
              </>
            )}
            {!isHandedOff && isCustodyTransferred && (
              <>
                <Text size='md' c='gray.5'>•</Text>
                <Text size='md' c='teal.5'>Transferred</Text>
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
        {isCustodyTransferred && !isHistory && (
          <Stack align='center' gap='xs'>
            <Box
              component='img'
              data-testid='transferred-hold-checkerboard'
              src={checkerboardEmptyState}
              alt=''
              w={160}
              h={160}
            />
          </Stack>
        )}
        {isActive && isArrived && !isHistory && (
          <Stack align='center' gap='xs'>
            <LockedQRCode value={transferUrl} variant={isValid && isValidIncident(incident) ? undefined : 'locked'} />
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
                <Button data-testid='add-details-btn' size='md' onClick={onDetailsClick}>Add Details</Button>
              </Group>
            )}
            {canFinishDetails && (
              <Button size='md' onClick={onDetailsClick}>Finish Details</Button>
            )}
            {canViewDetails && (
              <Button size='md' variant='secondary' onClick={onDetailsClick}>Details</Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export default Hold;
