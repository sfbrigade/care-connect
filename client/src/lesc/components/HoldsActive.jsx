import { useNavigate } from 'react-router';
import { Box, Stack, Text, Loader } from '@mantine/core';

import { formatTime } from '@/utils/format';
import checkerboardEmptyState from '@/assets/icons/checkerboard-empty-state.svg';

import Hold from './Hold';
import HoldsAutoCancelledNotice from './HoldsAutoCancelledNotice';
import IncidentGroup from './IncidentGroup';
import { isInitialLoading, shouldShowTransferredHoldsPrompt } from './holdsViewModel';

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

function HoldsActive ({
  incident,
  deflections,
  isFetchingDeflections,
  onCancelHoldClick,
  onEditIncidentClick,
  onHandoffClick,
  onCancelIncidentClick,
  autoCancelledNotice,
  onDismissAutoCancelledNotice,
  adminCancelledNotice,
  onDismissAdminCancelledNotice,
  updatedAtMs = 0,
  holdsHighlighted = false,
  currentUserId,
  incidentDetailsComplete = false,
}) {
  const navigate = useNavigate();

  const hasDeflections = (deflections?.length ?? 0) > 0;
  const showInitialLoading = isInitialLoading(isFetchingDeflections, deflections);
  const hasExpiredAutoCancelledHolds = (autoCancelledNotice?.count ?? 0) > 0;
  const hasAdminCancelledHolds = (adminCancelledNotice?.count ?? 0) > 0;
  const showAllExpiredState = !showInitialLoading && !hasDeflections && autoCancelledNotice?.allExpired;
  const showAllAdminCancelledState = !showInitialLoading && !hasDeflections && adminCancelledNotice?.allCancelled;
  const showTransferredHoldsPrompt = shouldShowTransferredHoldsPrompt(incident, deflections);
  const showNoActiveHoldsState = !showInitialLoading && !hasDeflections && !showTransferredHoldsPrompt && !showAllAdminCancelledState;
  const showUpdatedAt = updatedAtMs > 0 && (hasDeflections || showTransferredHoldsPrompt);

  return (
    <>
      {hasAdminCancelledHolds && (
        <HoldsAutoCancelledNotice
          message={adminCancelledNotice.message}
          onClose={onDismissAdminCancelledNotice}
        />
      )}
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
          <IncidentGroup
            incident={incident}
            incidentId={incident?.id}
            onEditClick={onEditIncidentClick}
            onHandoffClick={onHandoffClick}
            onCancelClick={onCancelIncidentClick}
          >
            {[...(deflections ?? [])]
              .sort((a, b) => {
                const aHandedOff = currentUserId && a.currentOfficerId && a.currentOfficerId !== currentUserId;
                const bHandedOff = currentUserId && b.currentOfficerId && b.currentOfficerId !== currentUserId;
                if (aHandedOff && !bHandedOff) return 1;
                if (!aHandedOff && bHandedOff) return -1;
                return 0;
              })
              .map((deflection) => {
                const isHandedOff = !!currentUserId && !!deflection.currentOfficerId && deflection.currentOfficerId !== currentUserId;
                return (
                  <Hold
                    key={deflection.id}
                    incident={incident}
                    deflection={deflection}
                    highlighted={holdsHighlighted}
                    isHandedOff={isHandedOff}
                    onCancelClick={() => onCancelHoldClick(deflection)}
                    onDetailsClick={() => {
                      if (deflection.subjectId) {
                        navigate(`/holds/${deflection.id}`);
                        return;
                      }

                      const subjectPath = `/holds/${deflection.id}/subject?isNew=true`;
                      if (incidentDetailsComplete) {
                        navigate(subjectPath);
                        return;
                      }

                      navigate(`/incident?next=${encodeURIComponent(subjectPath)}`);
                    }}
                  />
                );
              })}
          </IncidentGroup>
          {showUpdatedAt && (
            <Text size='xs' c='gray.5' ta='center'>
              Last updated: {formatTime(new Date(updatedAtMs))}
            </Text>
          )}
        </>
      )}
    </>
  );
}
export default HoldsActive;
