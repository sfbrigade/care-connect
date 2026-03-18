import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Stack, Text, Loader } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Api from '@/Api';
import { formatTime } from '@/utils/format';
import checkerboardEmptyState from '@/assets/icons/checkerboard-empty-state.svg';
import Incident from './Incident';
import Hold from './Hold';
import { useToast } from '@/components/ToastContext';
import { isInitialLoading, shouldShowIncidentInActive, shouldShowTransferredHoldsPrompt } from './holdsViewModel';

function CheckerboardEmptyState ({ title, subtitle, updatedAtMs = 0, showUpdatedAt = false }) {
  return (
    <Stack align='center' gap='lg' p='24px' w='100%'>
      <Box
        component='img'
        data-testid='transferred-holds-checkerboard'
        src={checkerboardEmptyState}
        alt=''
        w={160}
        h={160}
      />
      <Text c='var(--mantine-color-text)' ta='center' size='xl' lh='md' w='100%'>
        {title}
      </Text>
      {subtitle && (
        <Text c='var(--mantine-color-text)' ta='center' size='xl' lh='md' w='100%'>
          {subtitle}
        </Text>
      )}
      {showUpdatedAt && updatedAtMs > 0 && (
        <Text size='xs' c='gray.5' ta='center'>
          Last updated: {formatTime(new Date(updatedAtMs))}
        </Text>
      )}
    </Stack>
  );
}

function ExtendAllHoldsAction ({ loading, onClick }) {
  return (
    <Button
      disabled={loading}
      variant='secondary'
      fullWidth
      h={64}
      radius='xl'
      onClick={onClick}
    >
      {loading ? <Loader size='sm' /> : 'Extend all holds'}
    </Button>
  );
}

function HoldsActive ({ incident, deflections, isFetchingDeflections, onCancelHoldClick, updatedAtMs = 0 }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [holdsHighlighted, setHoldsHighlighted] = useState(false);

  const extendAllHoldsMutation = useMutation({
    mutationFn: () => Api.incidents.extend(incident.id),
    onSuccess: (response) => {
      queryClient.setQueryData(['deflections', incident?.id, 'active'], response.data);
      showToast('All active holds have been reset to 60 minutes.', 'success');
      setHoldsHighlighted(true);
    },
    onError: () => {
      showToast('Couldn\u2019t extend holds. Please try again.', 'error');
    },
  });

  useEffect(() => {
    if (!holdsHighlighted) return undefined;
    const timerId = window.setTimeout(() => setHoldsHighlighted(false), 3000);
    return () => window.clearTimeout(timerId);
  }, [holdsHighlighted]);

  function onExtendAllClick () {
    extendAllHoldsMutation.mutate();
  }

  const hasDeflections = (deflections?.length ?? 0) > 0;
  const showInitialLoading = isInitialLoading(isFetchingDeflections, deflections);
  const showIncident = shouldShowIncidentInActive(incident, deflections);
  const showTransferredHoldsPrompt = shouldShowTransferredHoldsPrompt(incident, deflections);
  const showNoActiveHoldsState = !showInitialLoading && !hasDeflections && !showTransferredHoldsPrompt;
  const showExtendAllButton = hasDeflections;

  return (
    <>
      {showIncident && (
        <Incident incident={incident} editLink='/incident' />
      )}
      {showInitialLoading && (
        <Loader mx='auto' my='xl' size='lg' />
      )}
      {!showInitialLoading && !hasDeflections && showTransferredHoldsPrompt && (
        <CheckerboardEmptyState
          title='All holds transferred.'
          subtitle={'When you leave RESET, make sure to tap "I\'ve left".'}
          updatedAtMs={updatedAtMs}
          showUpdatedAt
        />
      )}
      {showNoActiveHoldsState && (
        <CheckerboardEmptyState title='No active holds.' />
      )}
      {hasDeflections && (
        <>
          <Stack gap='md'>
            {deflections?.map((deflection) => (
              <Hold
                key={deflection.id}
                incident={incident}
                deflection={deflection}
                highlighted={holdsHighlighted}
                onCancelClick={() => onCancelHoldClick(deflection)}
                onDetailsClick={() => {
                  navigate(deflection.subjectId ? `/holds/${deflection.id}` : `/holds/${deflection.id}/subject?isNew=true`);
                }}
              />
            ))}
          </Stack>
          {showExtendAllButton && (
            <ExtendAllHoldsAction
              loading={extendAllHoldsMutation.isPending}
              onClick={onExtendAllClick}
            />
          )}
        </>
      )}
    </>
  );
}
export default HoldsActive;
