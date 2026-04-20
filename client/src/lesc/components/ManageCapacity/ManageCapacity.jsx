import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip, Container, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';
import IconButtonLink from '@/components/IconButtonLink';

import AdjustAvailability from './AdjustAvailability';
import ChangeStatus from './ChangeStatus';
import ManageHolds from './ManageHolds';

function ManageCapacity () {
  const { facility } = useFacilityContext();
  const [selectedAction, setSelectedAction] = useState(null);

  const { data: freshFacility } = useQuery({
    queryKey: ['facilities', facility.id],
    queryFn: () => Api.facilities.get(facility.id).then(response => response.data),
    ...facilityLiveQueryOptions,
  });

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
    ...facilityLiveQueryOptions,
  });

  const currentFacility = freshFacility || facility;
  const bedType = bedTypes?.[0];

  return (
    <Container size='xs' px='xl'>
      <Head>
        <title>Manage capacity</title>
      </Head>
      <Stack>
        <IconButtonLink icon={IconArrowLeft} to='/' />

        <div>
          <Text c='dimmed' size='sm'>Manage capacity</Text>
          <Title order={2}>Update chair availability or facility status.</Title>
        </div>

        {bedType && (
          <Stack gap='xs'>
            <Text>Available now – <Text span fw={700}>{bedType.available}</Text>/{bedType.capacity}</Text>
            <Text>Held (in transit) – <Text span fw={700}>{bedType.inTransit}</Text></Text>
            <Text>Held (in custody on site) – <Text span fw={700}>{bedType.holds - bedType.inTransit}</Text></Text>
            <Text>Occupied – <Text span fw={700}>{bedType.occupied}</Text></Text>
            <Text>Unavailable – <Text span fw={700}>{bedType.unavailableUnoccupied}</Text></Text>
          </Stack>
        )}

        <Title order={4}>What do you want to do?</Title>

        <Chip.Group value={selectedAction} onChange={setSelectedAction}>
          <Stack gap='sm' align='flex-start'>
            <Chip value='adjustAvailability'>Adjust chair availability</Chip>
            <Chip value='manageHolds'>Manage chair holds</Chip>
            <Chip value='changeStatus'>Change facility status</Chip>
          </Stack>
        </Chip.Group>

        {selectedAction === 'adjustAvailability' && bedType && (
          <AdjustAvailability
            facility={currentFacility}
            bedType={bedType}
            onCancel={() => setSelectedAction(null)}
          />
        )}

        {selectedAction === 'manageHolds' && (
          <ManageHolds facility={currentFacility} />
        )}

        {selectedAction === 'changeStatus' && (
          <ChangeStatus
            facility={currentFacility}
            onCancel={() => setSelectedAction(null)}
          />
        )}
      </Stack>
    </Container>
  );
}

export default ManageCapacity;
