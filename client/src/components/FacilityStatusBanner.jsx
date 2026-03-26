import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Text } from '@mantine/core';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';

const BANNER_CONFIG = {
  OPEN_NOT_ACCEPTING: {
    color: 'yellow',
    bg: '#fff3bf',
    title: 'New holds are paused. Existing holds can still be transferred.',
  },
  CLOSED: {
    color: 'red',
    bg: 'red.1',
    title: 'Active holds were cancelled. Do not bring persons to this facility.',
  },
};

function FacilityStatusBanner () {
  const { facility } = useFacilityContext();
  const [dismissed, setDismissed] = useState(false);

  const { data: freshFacility } = useQuery({
    queryKey: ['facilities', facility?.id],
    queryFn: () => Api.facilities.get(facility.id).then(r => r.data),
    enabled: !!facility?.id,
    refetchOnWindowFocus: true,
  });

  const currentFacility = freshFacility || facility;

  if (!currentFacility || currentFacility.status === 'OPEN_ACCEPTING' || dismissed) {
    return null;
  }

  const config = BANNER_CONFIG[currentFacility.status];
  if (!config) return null;

  const announcement = currentFacility.statusOther;

  return (
    <Alert
      color={config.color}
      bg={config.bg}
      icon={<IconAlertTriangle size={20} />}
      withCloseButton
      onClose={() => setDismissed(true)}
      closeButtonProps={{ icon: <IconX size={16} /> }}
      radius='md'
    >
      <Text size='sm' fw={500}>{config.title}</Text>
      {announcement && (
        <Text size='sm'>{announcement}</Text>
      )}
    </Alert>
  );
}

export default FacilityStatusBanner;
