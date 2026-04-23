import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Text } from '@mantine/core';
import { IconAlertCircle, IconX } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';

function getBannerConfig (facilityName) {
  return {
    OPEN_NOT_ACCEPTING: {
      color: 'yellow',
      bg: '#fff3bf',
      title: 'New holds are paused. Continue processing current persons.',
    },
    CLOSED: {
      color: 'red',
      bg: 'red.1',
      title: `${facilityName} is temporarily closed.`,
    },
  };
}

function FacilityStatusBanner () {
  const { facility } = useFacilityContext();
  const [dismissed, setDismissed] = useState(false);

  const { data: freshFacility } = useQuery({
    queryKey: ['facilities', facility?.id],
    queryFn: () => Api.facilities.get(facility.id).then(r => r.data),
    enabled: !!facility?.id,
    ...facilityLiveQueryOptions,
  });

  const currentFacility = freshFacility || facility;

  if (!currentFacility || currentFacility.status === 'OPEN_ACCEPTING' || dismissed) {
    return null;
  }

  const config = getBannerConfig(currentFacility.name)[currentFacility.status];
  if (!config) return null;

  const announcement = currentFacility.statusOther;

  return (
    <Alert
      color={config.color}
      bg={config.bg}
      icon={<IconAlertCircle size={20} />}
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
