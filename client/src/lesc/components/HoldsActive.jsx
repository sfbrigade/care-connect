import { useNavigate } from 'react-router';
import { Box, Button, Stack, Title, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import Incident from './Incident';
import Hold from './Hold';
import { useToast } from '@/components/ToastContext';

function HoldsActive ({ incident, deflections, onCancelHoldClick }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const extendAllHoldsMutation = useMutation({
    mutationFn: () => Api.incidents.extend(incident.id),
    onSuccess: (response) => {
      queryClient.setQueryData(['deflections', incident?.id, 'active'], response.data);
      showToast('All active holds have been reset to 60 minutes.', 'success');
    },
    onError: () => {
      showToast('Couldn’t extend holds. Please try again.', 'error');
    },
  });

  function onExtendAllClick () {
    extendAllHoldsMutation.mutate();
  }

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
                  navigate(deflection.subjectId ? `/holds/${deflection.id}` : `/holds/${deflection.id}/subject`);
                }}
              />
            ))}
          </Stack>
          <Button
            variant='secondary'
            fullWidth
            onClick={onExtendAllClick}
          >
            Extend all holds
          </Button>
        </>
      )}
    </>
  );
}
export default HoldsActive;
