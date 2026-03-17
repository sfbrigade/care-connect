import { useNavigate } from 'react-router';
import { Box, Button, Stack, Text, Loader } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Api from '@/Api';
import Incident from './Incident';
import Hold from './Hold';
import HoldsAutoCancelledNotice from './HoldsAutoCancelledNotice';
import { useToast } from '@/components/ToastContext';
import { isInitialLoading, shouldShowIncidentInActive } from './holdsViewModel';
import classes from './HoldsActive.module.css';

function HoldsActive ({
  incident,
  deflections,
  isFetchingDeflections,
  onCancelHoldClick,
  autoCancelledNotice,
  onDismissAutoCancelledNotice,
}) {
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
      showToast('Couldn\u2019t extend holds. Please try again.', 'error');
    },
  });

  function onExtendAllClick () {
    extendAllHoldsMutation.mutate();
  }

  const hasDeflections = (deflections?.length ?? 0) > 0;
  const showInitialLoading = isInitialLoading(isFetchingDeflections, deflections);
  const showIncident = shouldShowIncidentInActive(incident, deflections);
  const hasExpiredAutoCancelledHolds = (autoCancelledNotice?.count ?? 0) > 0;
  const showAllExpiredState = !showInitialLoading && !hasDeflections && autoCancelledNotice?.allExpired;

  return (
    <>
      {hasExpiredAutoCancelledHolds && !autoCancelledNotice?.allExpired && (
        <HoldsAutoCancelledNotice
          count={autoCancelledNotice.count}
          onClose={onDismissAutoCancelledNotice}
        />
      )}
      {showIncident && (
        <Incident incident={incident} editLink='/incident' />
      )}
      {showInitialLoading && (
        <Loader mx='auto' my='xl' size='lg' />
      )}
      {!showInitialLoading && !hasDeflections && !showAllExpiredState && (
        <Box pt='xl'>
          <Stack align='center' gap='xl' p='lg'>
            <Box h='160px' w='160px' className={classes.placeholder} />
            <Text c='dark.8' fz='xl' fw={400} lh='md' ta='center'>
              No active holds.
            </Text>
          </Stack>
        </Box>
      )}
      {showAllExpiredState && (
        <Box pt='xl'>
          <Stack align='center' gap='xl' p='lg'>
            <Box h='160px' w='160px' className={classes.placeholder} />
            <Text c='dark.8' fz='xl' fw={400} lh='md' maw='320px' ta='center'>
              All holds were auto-canceled after they expired. Check History for details.
            </Text>
          </Stack>
        </Box>
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
              {extendAllHoldsMutation.isPending ? <Loader size='sm' /> : hasExpiredAutoCancelledHolds ? 'Extend active holds' : 'Extend all holds'}
            </Button>
          )}
        </>
      )}
    </>
  );
}
export default HoldsActive;
