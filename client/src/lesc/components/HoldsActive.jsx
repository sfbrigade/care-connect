import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Stack, Text, Loader } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { formatTime } from '@/utils/format';
import checkerboardEmptyState from '@/assets/icons/checkerboard-empty-state.svg';
import ActionFooter from '@/components/ActionFooter';
import { useToast } from '@/components/ToastContext';

import Incident from './Incident';
import Hold from './Hold';
import HoldsAutoCancelledNotice from './HoldsAutoCancelledNotice';
import SectionContainer from './SectionContainer';
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
    <ActionFooter>
      <Button
        disabled={loading}
        variant='secondary'
        onClick={onClick}
      >
        {loading ? <Loader size='sm' /> : 'Extend active holds'}
      </Button>
    </ActionFooter>
  );
}

function HoldsActive ({
  incident,
  deflections,
  isFetchingDeflections,
  onCancelHoldClick,
  autoCancelledNotice,
  onDismissAutoCancelledNotice,
  updatedAtMs = 0
}) {
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
  const hasExpiredAutoCancelledHolds = (autoCancelledNotice?.count ?? 0) > 0;
  const showAllExpiredState = !showInitialLoading && !hasDeflections && autoCancelledNotice?.allExpired;
  const showTransferredHoldsPrompt = shouldShowTransferredHoldsPrompt(incident, deflections);
  const showNoActiveHoldsState = !showInitialLoading && !hasDeflections && !showTransferredHoldsPrompt;
  const showExtendAllButton = hasDeflections;
  const showUpdatedAt = updatedAtMs > 0 && (hasDeflections || showTransferredHoldsPrompt);

  return (
    <>
      {hasExpiredAutoCancelledHolds && !autoCancelledNotice?.allExpired && (
        <HoldsAutoCancelledNotice
          count={autoCancelledNotice.count}
          onClose={onDismissAutoCancelledNotice}
        />
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
      {showAllExpiredState && (
        <CheckerboardEmptyState
          title='All holds were auto-canceled after they expired. Check History for details.'
        />
      )}
      {!showAllExpiredState && showNoActiveHoldsState && (
        <CheckerboardEmptyState title='No active holds.' />
      )}
      {hasDeflections && (
        <>
          <SectionContainer>
            <Stack gap='md'>
              {showIncident && (
                <Incident incident={incident} editLink='/incident' />
              )}
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
          </SectionContainer>
          {showUpdatedAt && (
            <Text size='xs' c='gray.5' ta='center'>
              Last updated: {formatTime(new Date(updatedAtMs))}
            </Text>
          )}
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
