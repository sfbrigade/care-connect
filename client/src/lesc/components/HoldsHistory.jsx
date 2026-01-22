import { useNavigate } from 'react-router';
import { Box, Stack, Title, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import Hold from './Hold';

function HoldsHistory ({ facility }) {
  const navigate = useNavigate();

  const { data: deflections } = useQuery({
    queryKey: ['deflections', facility?.id, 'inactive'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, active: false }).then(response => response.data),
    enabled: !!facility,
  });

  return (
    <>
      {(!deflections || deflections.length === 0) && (
        <>
          <Box bdrs='50%' bg='gray.1' w='160px' h='160px' mx='auto' />
          <Box align='center'>
            <Title order={4}>You don't have any past holds</Title>
            <Text size='md' c='dimmed'>Completed, cancelled, and expired holds will show up here.</Text>
          </Box>
        </>
      )}
      {deflections && deflections.length > 0 && (
        <>
          <Stack gap='md'>
            {deflections?.map((deflection) => (
              <Hold
                key={deflection.id}
                deflection={deflection}
                onDetailsClick={() => {
                  navigate(`/holds/${deflection.id}`);
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </>
  );
}

export default HoldsHistory;
