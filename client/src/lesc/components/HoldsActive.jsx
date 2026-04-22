import { useNavigate } from 'react-router';
import { Box, Stack, Text } from '@mantine/core';

import { formatTime } from '@/utils/format';
import checkerboardEmptyState from '@/assets/icons/checkerboard-empty-state.svg';

import Hold from './Hold';
import HoldsAutoCancelledNotice from './HoldsAutoCancelledNotice';
import IncidentGroup from './IncidentGroup';

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
  incidents,
  onCancelHoldClick,
  onEditIncidentClick,
  onHandoffClick,
  autoCancelledNotice,
  onDismissAutoCancelledNotice,
  adminCancelledNotice,
  onDismissAdminCancelledNotice,
  updatedAtMs = 0,
  holdsHighlighted = false,
  currentUserId,
}) {
  const navigate = useNavigate();

  const allDeflections = incidents.flatMap(inc => inc.deflections);
  const hasDeflections = allDeflections.length > 0;
  const hasExpiredAutoCancelledHolds = (autoCancelledNotice?.count ?? 0) > 0;
  const hasAdminCancelledHolds = (adminCancelledNotice?.count ?? 0) > 0;
  const showAllAdminCancelledState = !hasDeflections && adminCancelledNotice?.allCancelled;
  const showNoActiveHoldsState = !hasDeflections && !showAllAdminCancelledState;
  const showUpdatedAt = updatedAtMs > 0 && hasDeflections;

  return (
    <>
      {hasAdminCancelledHolds && (
        <HoldsAutoCancelledNotice
          message={adminCancelledNotice.message}
          onClose={onDismissAdminCancelledNotice}
        />
      )}
      {hasExpiredAutoCancelledHolds && (
        <HoldsAutoCancelledNotice
          count={autoCancelledNotice.count}
          onClose={onDismissAutoCancelledNotice}
        />
      )}
      {showNoActiveHoldsState && (
        <CheckerboardEmptyState title='No active holds.' />
      )}
      {hasDeflections && (
        <>
          {incidents.map((incident) => (
            <IncidentGroup
              key={incident.id}
              incident={incident}
              incidentId={incident.id}
              onEditClick={incident.canEdit ? () => onEditIncidentClick(incident.id) : undefined}
              onHandoffClick={incident.canHandoff ? onHandoffClick : undefined}
              onCancelClick={incident.deflections?.length ? () => onCancelHoldClick(incident.deflections) : undefined}
            >
              {incident.deflections.map((deflection) => (
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
            </IncidentGroup>
          ))}
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
