import { useNavigate } from 'react-router';
import { Box, Button, Stack, Title, Text, Loader } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Api from '@/Api';
import Incident from './Incident';
import Hold from './Hold';
import { useToast } from '@/components/ToastContext';
import { isInitialLoading, shouldShowIncidentInActive } from './holdsViewModel';

function HoldsActive ({ incident, deflections, isFetchingDeflections, onCancelHoldClick }) {
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

  const hasDeflections = (deflections?.length ?? 0) > 0;
  const showInitialLoading = isInitialLoading(isFetchingDeflections, deflections);
  const showIncident = shouldShowIncidentInActive(incident, deflections);

  return (
    <>
      {showIncident && (
        <Incident incident={incident} editLink='/incident' />
      )}
      {showInitialLoading && (
        <Loader mx='auto' my='xl' size='lg' />
      )}
      {!showInitialLoading && !hasDeflections && (
        <>
          <Box bdrs='50%' bg='gray.1' w='160px' h='160px' mx='auto' />
          <Box align='center'>
            <Title order={4}>You don't have any active holds</Title>
            <Text size='md' c='dimmed'>New holds will show up here once you start them.</Text>
          </Box>
        </>
      )}
      {hasDeflections && (
        <>
          <Stack gap='md'>
            {deflections?.map((deflection) => (
              <Hold
                key={deflection.id}
                incident={incident}
                deflection={deflection}
                onCancelClick={() => onCancelHoldClick(deflection)}
                onDetailsClick={() => {
                  navigate(deflection.subjectId ? `/holds/${deflection.id}` : `/holds/${deflection.id}/subject?isNew=true`);
                }}
              />
            ))}
          </Stack>
          {!incident?.arrivedAt && (
            <Button disabled={extendAllHoldsMutation.isPending} variant='secondary' fullWidth onClick={onExtendAllClick}>
              {extendAllHoldsMutation.isPending ? <Loader size='sm' /> : 'Extend all holds'}
            </Button>
          )}
        </>
      )}
    </>
  );
}
export default HoldsActive;
