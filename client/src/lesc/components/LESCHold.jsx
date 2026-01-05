import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';

import { calculateAge, formatTimeRemaining } from '@/utils/dateTime';

/**
 * LESCHold component for displaying individual bed hold cards
 * Matches Figma design with patient information and status badge
 */
function LESCHold ({
  hold,
  // Patient information (optional)
  patientId,
  patientName,
  patientDob,
  patientSex,
  // Actions
  onViewDetails,
}) {
  // Extract hold ID for display (first 3 characters or full ID)
  const displayId = hold?.id ? hold.id.slice(0, 3).toUpperCase() : patientId || '001';

  // Use patient name if provided, otherwise use hold notes or fallback
  const displayName = patientName || hold?.notes || 'Person X';

  let patientAge;
  if (patientDob) {
    patientAge = calculateAge(patientDob);
  }
  const patientDetails = [];
  if (patientAge) {
    patientDetails.push(`${patientAge} y.o.`);
  }
  if (patientSex) {
    patientDetails.push(patientSex);
  }

  return (
    <Card bg='white' p='xl' withBorder>
      <Stack gap='xl'>
        <Stack gap='sm'>
          <Text size='md' color='gray.6'>Hold {displayId}</Text>
          <Box>
            <Title order={3}>{displayName}</Title>
            {patientDetails.length > 0 && (
              <Text size='md'>
                {patientDetails.join(', ')}
              </Text>
            )}
          </Box>
        </Stack>
        <Group justify='space-between'>
          <Title order={3}>{formatTimeRemaining(hold?.expiresAt) ?? ''}</Title>
          <Button variant='secondary' onClick={onViewDetails}>View Details</Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default LESCHold;
