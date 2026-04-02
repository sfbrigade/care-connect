import { Box, Group, Text } from '@mantine/core';
import { IconPencilMinus } from '@tabler/icons-react';
import { formatSmartDateTime } from '@/utils/format';

import IconButtonLink from '@/components/IconButtonLink';
import { isValidIncident } from '@/utils/validators';

function Incident ({ incident, incidentId, editLink }) {
  const isIncomplete = incident ? !isValidIncident(incident) : false;
  const address = `${incident?.addressLine1 ?? ''}${incident?.addressLine2 ? `, ${incident.addressLine2}` : ''}`;
  const displayId = incident?.id ?? incidentId ?? '';

  return (
    <Group justify='space-between' px='sm'>
      <Box>
        <Group gap='xs'>
          <Text size='md'>
            Incident {displayId}
          </Text>
          {isIncomplete && <Text c='gray.5' size='md'>•</Text>}
          {isIncomplete && <Text c='red.6' size='md'>Details incomplete</Text>}
        </Group>
        <Group gap='xs'>
          <Text c='dimmed' size='md'>{address || 'Address unavailable'}</Text>
          <Text c='dimmed' size='md'>•</Text>
          <Text c='dimmed' size='md'>{incident?.arrestedAt ? formatSmartDateTime(incident.arrestedAt) : 'Time unavailable'}</Text>
        </Group>
      </Box>
      {editLink && (
        <Box>
          <IconButtonLink icon={IconPencilMinus} to={editLink} variant={isIncomplete ? 'primary' : 'default'} />
        </Box>
      )}
    </Group>
  );
}

export default Incident;
