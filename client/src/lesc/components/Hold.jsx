import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';

import { calculateAge, formatTimeRemaining } from '@/utils/format';

function Hold ({
  deflection,
  onCancelClick,
  onDetailsClick,
}) {
  const { t } = useTranslation();
  const displayId = deflection?.id ? deflection.id.slice(0, 3).toUpperCase() : '';
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Let’s add subject details';

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
  const isActive = deflection.status === 'ACTIVE';
  const isCancelled = deflection.status === 'CANCELLED';
  const isExpired = deflection.status === 'EXPIRED' || (isActive && DateTime.fromISO(deflection?.expiresAt).diffNow('minutes').minutes < 0);
  const isExpiringSoon = isActive && DateTime.fromISO(deflection?.expiresAt).diffNow('minutes').minutes < 10;
  const isValid = !!deflection?.subject?.firstName &&
    !!deflection?.subject?.lastName &&
    !!deflection?.subject?.dateOfBirth &&
    !!deflection?.subject?.sex &&
    !!deflection?.subject?.race &&
    !!deflection?.behavior; // TODO: check property, move this logic somewhere reusable

  return (
    <Card bg='white' p='xl' withBorder>
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Group gap='xs'>
            <Text size='md' c='gray.6'>Hold {displayId}</Text>
            {!isNew && !isValid && (
              <>
                <Text size='md' c='gray.6'>•</Text>
                <Text size='md' c='red.6'>Details incomplete</Text>
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
        <Group justify='space-between' wrap='nowrap'>
          {isExpired && (
            <Title order={3} c='red.6'>Expired</Title>
          )}
          {isActive && !isExpired && (
            <Title order={3} c={isExpiringSoon ? 'red.6' : 'black'}>{formatTimeRemaining(deflection?.expiresAt) ?? ''}</Title>
          )}
          {isCancelled && (
            <Title order={3} c='red.6'>Cancelled</Title>
          )}
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
          {!isNew && !isValid && !isExpired && !isCancelled && (
            <Button size='md' variant='light' color='red.6' onClick={onCancelClick}>Cancel</Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default Hold;
