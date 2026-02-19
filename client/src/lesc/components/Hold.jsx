import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import { QRCodeSVG } from 'qrcode.react';
import { IconLock } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatTime, calculateAge } from '@/utils/format';

import Api from '@/Api';

function Hold ({ deflection, onCancelClick, onDetailsClick }) {
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const displayId = String(deflection.id).padStart(6, '0');
  const displayName =
    [
      deflection?.subject?.firstName,
      deflection?.subject?.middleInitial,
      deflection?.subject?.lastName,
    ]
      .filter(Boolean)
      .join(' ') || 'Let’s add subject details';
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
  // const minutesSinceExpiration =
  //   minutesUntilExpiration !== null
  //     ? Math.max(0, Math.floor(-minutesUntilExpiration))
  //     : null;
  const isExpired =
    isExpiredStatus ||
    (isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 0);
  // const isExpiringSoon =
  //   isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 10;
  const isValid =
    !!deflection?.subject?.firstName &&
    !!deflection?.subject?.lastName &&
    !!deflection?.subject?.dateOfBirth &&
    !!deflection?.subject?.sex &&
    !!deflection?.subject?.race &&
    !!deflection?.behavior; // TODO: check property, move this logic somewhere reusable

  const isArrived = deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER';
  const transferUrl = `${window.location.origin}/transfer/${deflection.id}`;

  const { data: cancelReason } = useQuery({
    queryKey: ['deflections', 'cancelReasons', deflection.cancelReasonId],
    queryFn: () => Api.deflections.cancelReasons.get(deflection.cancelReasonId),
    enabled: !!deflection.cancelReasonId,
  });

  const reopenHoldMutation = useMutation({
    mutationFn: () => Api.deflections.cancelReasons.reopen(deflection.id),
    onSuccess: (response) => {
      queryClient.setQueryData(
        ['facilities', 'cancelReasons', deflection.id],
        response.data
      );
      queryClient.invalidateQueries();
    },
  });

  const reopenHold = () => {
    reopenHoldMutation.mutate(deflection.id);
  };
  useEffect(() => {
    if (!deflection?.expiresAt || (!isActive && !isExpiredStatus)) { return undefined; }

    setNow(DateTime.now());
    const intervalId = window.setInterval(() => {
      setNow(DateTime.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [isActive, isExpiredStatus, deflection?.expiresAt, isArrived]);

  function cancelReasonMessage () {
    if (deflection.cancelReasonId != null) {
      return `Cancelled at ${formatTime(deflection?.cancelledAt) || 'Unknown'} (${cancelReason?.data.name || 'unknown reason'})`;
    }
  }
  return (
    <Card bg='white' p='xl' withBorder>
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group gap='xs'>
            <Text size='md' c='gray.6'>
              Hold {displayId}
            </Text>
            <>
              <Text size='md' c='gray.6'>
                •
              </Text>
              <Text size='md' c='yellow.6'>
                {cancelReasonMessage()}
              </Text>
            </>
          </Group>
          <Box>
            <Title order={3}>{displayName}</Title>
            {subjectDetails.length > 0 && (
              <Text size='md'>{subjectDetails.join(', ')}</Text>
            )}
          </Box>
        </Stack>
        {isActive && isArrived && (
          <Group justify='center'>
            <Box pos='relative'>
              <Box opacity={isReadyForTransfer ? 1 : 0.1}>
                <QRCodeSVG value={transferUrl} size={160} />
              </Box>
              {!isValid && (
                <Group
                  pos='absolute'
                  w={80}
                  h={80}
                  bg='white'
                  bdrs='50%'
                  top={40}
                  left={40}
                  justify='center'
                  align='center'
                >
                  <IconLock size={24} color='black' />
                </Group>
              )}
            </Box>
          </Group>
        )}
        <Group justify='right' wrap='nowrap'>
          {isNew && !isExpired && !isCancelled && (
            <Group gap='sm' wrap='nowrap'>
              <Button
                size='md'
                variant='light'
                color='red.6'
                onClick={onCancelClick}
              >
                Cancel
              </Button>
              <Button size='md' onClick={onDetailsClick}>
                Add Details
              </Button>
            </Group>
          )}
          {!isNew && !isValid && !isExpired && !isCancelled && (
            <Button size='md' onClick={onDetailsClick}>
              Finish Details
            </Button>
          )}
          {!isNew && (isValid || isCancelled || isExpired) && (
            <Button size='md' variant='secondary' onClick={onDetailsClick}>
              View Details
            </Button>
          )}
          {(isCancelled || isExpired) && (
            <Button
              size='md'
              variant='filled'
              color='indigo'
              onClick={reopenHold}
            >
              Reopen Hold
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default Hold;
