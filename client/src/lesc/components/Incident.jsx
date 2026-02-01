import { Box, Group, Text } from '@mantine/core';
import { IconPencilMinus } from '@tabler/icons-react';
import { formatTime } from '@/utils/format';

import IconButtonLink from '@/components/IconButtonLink';
import { isValidIncident } from '@/utils/validators';

function Incident ({ incident, editLink }) {
  const isIncomplete = !isValidIncident(incident);
  const address = `${incident?.addressLine1 ?? ''}${incident?.addressLine2 ? `, ${incident.addressLine2}` : ''}`;

  return (
    <Group justify='space-between'>
      <Box>
        <Group gap='xs'>
          <Text size='md'>
            Incident {incident ? String(incident.id).padStart(6, '0') : ''}
          </Text>
          {isIncomplete && <Text c='gray.5' size='md'>•</Text>}
          {isIncomplete && <Text c='red.6' size='md'>Details incomplete</Text>}
        </Group>
        <Group gap='xs'>
          {address && <Text c='gray.5' size='md'>{address}</Text>}
          {address && incident?.arrestedAt && <Text c='gray.5' size='md'>•</Text>}
          {incident?.arrestedAt && <Text c='gray.5' size='md'>{formatTime(incident.arrestedAt)}</Text>}
        </Group>
      </Box>
      <Box>
        <IconButtonLink icon={IconPencilMinus} to={editLink} variant='primary' />
      </Box>
    </Group>
  );
}

export default Incident;
