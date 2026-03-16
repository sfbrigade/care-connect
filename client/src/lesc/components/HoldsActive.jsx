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

function CheckerboardEmptyState ({ title, updatedAtMs = 0, showUpdatedAt = false }) {
  return (
    <Stack align='center' gap='lg' p='24px' w='100%'>
      <Box
        component='img'
        data-testid='transferred-holds-checkerboard'
        src={checkerboardEmptyState}
        alt=''
        w={160}
        h={160}
        style={{
          aspectRatio: '1 / 1',
          borderRadius: '4px',
          display: 'block',
          objectFit: 'cover',
        }}
      />
      <Text c='var(--mantine-color-text)' ta='center' style={{ fontSize: '20px', fontWeight: 400, lineHeight: '24px', alignSelf: 'stretch' }}>
        {title}
      </Text>
      {showUpdatedAt && updatedAtMs > 0 && (
        <Text size='xs' c='gray.5' ta='center'>
          Last updated: {formatTime(new Date(updatedAtMs))}
        </Text>
      )}
    </Stack>
  );
}

function ExtendAllHoldsAction ({ disabled, loading, onClick, inset = false }) {
  const button = (
    <Button
      disabled={disabled || loading}
      variant='secondary'
      fullWidth
      h={64}
      radius='xl'
      onClick={onClick}
      styles={{
        root: {
          fontSize: '1.25rem',
          fontWeight: 400,
        },
      }}
    >
      {loading ? <Loader size='sm' /> : 'Extend all holds'}
    </Button>
  );

  if (!inset) {
    return button;
  }

  return (
    <Box
      mx='auto'
      w='100%'
      maw={380}
      p={16}
      style={{
        backgroundColor: 'var(--mantine-color-white)',
        borderRadius: '999px',
        boxShadow: '0 4px 12px rgba(18, 32, 59, 0.08)',
      }}
    >
      {button}
    </Box>
  );
}

function HoldsActive ({ incident, deflections, isFetchingDeflections, onCancelHoldClick, updatedAtMs = 0 }) {
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
  const showTransferredHoldsPrompt = shouldShowTransferredHoldsPrompt(incident, deflections);
  const showNoActiveHoldsState = !showInitialLoading && !hasDeflections && !showTransferredHoldsPrompt;
  const showExtendAllButton = hasDeflections || showTransferredHoldsPrompt;

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
          title={(
            <>
              All holds transferred.
              <br />
              When you leave RESET, make sure to tap &quot;I&apos;ve left&quot;.
            </>
          )}
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
                onCancelClick={() => onCancelHoldClick(deflection)}
                onDetailsClick={() => {
                  navigate(deflection.subjectId ? `/holds/${deflection.id}` : `/holds/${deflection.id}/subject?isNew=true`);
                }}
              />
            ))}
          </Stack>
          {showExtendAllButton && (
            <ExtendAllHoldsAction
              disabled={showTransferredHoldsPrompt}
              loading={extendAllHoldsMutation.isPending}
              inset={showTransferredHoldsPrompt}
              onClick={onExtendAllClick}
            />
          )}
        </>
      )}
    </>
  );
}
export default HoldsActive;
