import { useNavigate } from 'react-router';
import { Box, Button, Stack, Title, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import Incident from './Incident';
import Hold from './Hold';

function HoldsActive ({ incident, onCancelHoldClick }) {
  const navigate = useNavigate();

  const { data: deflections } = useQuery({
    queryKey: ['deflections', incident?.id, 'active'],
    queryFn: () => Api.deflections.list({ incidentId: incident.id, active: true }).then(response => response.data),
    enabled: !!incident,
  });

  return (
    <>
      {incident && (
        <Incident incident={incident} editLink='/incident' />
      )}
      {(!deflections || deflections.length === 0) && (
        <>
          <Box bdrs='50%' bg='gray.1' w='160px' h='160px' mx='auto' />
          <Box align='center'>
            <Title order={4}>You don't have any active holds</Title>
            <Text size='md' c='dimmed'>New holds will show up here once you start them.</Text>
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
                onCancelClick={() => onCancelHoldClick(deflection)}
                onDetailsClick={() => {
                  navigate(`/intake/${deflection.id}`);
                }}
              />
            ))}
          </Stack>
          <Button
            variant='secondary'
            fullWidth
          >
            Extend all holds
          </Button>
        </>
      )}
    </>
  );
}
export default HoldsActive;
