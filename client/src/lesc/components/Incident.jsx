import { ActionIcon, Box, Group, Menu, Text } from '@mantine/core';
import { IconDots, IconFileExport, IconPencilMinus, IconTrash } from '@tabler/icons-react';
import { formatSmartDateTime } from '@/utils/format';
import { isValidIncident } from '@/utils/validators';

function Incident ({ incident, incidentId, onEditClick, onCancelClick }) {
  const isIncomplete = incident ? !isValidIncident(incident) : false;
  const address = `${incident?.addressLine1 ?? ''}${incident?.addressLine2 ? `, ${incident.addressLine2}` : ''}`;
  const displayId = incident?.id ?? incidentId ?? '';

  return (
    <Group justify='space-between'>
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
      {(onEditClick || onCancelClick) && (
        <Box>
          <Menu
            position='bottom-end'
            shadow='sm'
            radius='lg'
            width={280}
            withinPortal
          >
            <Menu.Target>
              <ActionIcon
                variant='filled'
                color='gray.0'
                radius='50%'
                size={44}
                aria-label='Incident actions'
              >
                <IconDots size={20} color='var(--mantine-color-gray-7)' />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconPencilMinus size={18} color='var(--mantine-color-gray-5)' />}
                onClick={onEditClick}
              >
                Edit details
              </Menu.Item>
              <Menu.Item
                leftSection={<IconFileExport size={18} color='var(--mantine-color-gray-5)' />}
              >
                Handoff
              </Menu.Item>
              <Menu.Item
                c='red.6'
                leftSection={<IconTrash size={18} color='var(--mantine-color-red-4)' />}
                onClick={onCancelClick}
              >
                Cancel incident
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      )}
    </Group>
  );
}

export default Incident;
