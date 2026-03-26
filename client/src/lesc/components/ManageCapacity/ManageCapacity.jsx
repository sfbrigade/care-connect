import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip, Container, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import IconButtonLink from '@/components/IconButtonLink';

import AdjustAvailability from './AdjustAvailability';

function ManageCapacity () {
  const { facility } = useFacilityContext();
  const [selectedAction, setSelectedAction] = useState(null);

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
    refetchOnMount: 'always',
  });

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
            <Text>Held (in transit) – <Text span fw={700}>{bedType.holds}</Text></Text>
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
            facility={facility}
            bedType={bedType}
            onCancel={() => setSelectedAction(null)}
          />
        )}

        {selectedAction === 'manageHolds' && (
          <Text c='dimmed'>Manage holds coming in Step 7</Text>
        )}

        {selectedAction === 'changeStatus' && (
          <Text c='dimmed'>Change status form coming in Step 6</Text>
        )}
      </Stack>
    </Container>
  );
}

export default ManageCapacity;
