import { useNavigate } from 'react-router';
import { Box, Stack, Title, Text, Loader } from '@mantine/core';
import { useQueries } from '@tanstack/react-query';

import Hold from './Hold';
import IncidentGroup from './IncidentGroup';
import Api from '@/Api';
import { getDeflectionActivityMs, groupDeflectionsByIncident, isInitialLoading, splitCurrentIncidentDeflections } from './holdsViewModel';

function HoldsHistory ({ deflections, isFetchingDeflections = false, incident, hasActiveHolds = false, currentUserId }) {
  const navigate = useNavigate();
  const showInitialLoading = isInitialLoading(isFetchingDeflections, deflections);
  const hasDeflections = (deflections?.length ?? 0) > 0;

  // Coerce once at the top
  const safeDeflections = deflections ?? [];
  const { shouldShowCurrentIncidentGroup, currentIncidentDeflections, remainingDeflections } = splitCurrentIncidentDeflections(
    safeDeflections,
    incident,
    hasActiveHolds
  );
  const incidentIdList = [...new Set(remainingDeflections.map((deflection) => String(deflection.incidentId)))];

  const incidentQueries = useQueries({
    queries: incidentIdList.map((incidentId) => ({
      queryKey: ['incidents', incidentId],
      queryFn: () => Api.incidents.get(incidentId).then((response) => response.data),
      enabled: !!incidentId,
      retry: false,
    })),
  });

  const incidentsById = incidentIdList.reduce((acc, incidentId, index) => {
    const query = incidentQueries[index];
    if (query?.data) {
      acc[incidentId] = query.data;
    }
    return acc;
  }, {});

  const groupedByIncident = groupDeflectionsByIncident(remainingDeflections, incidentsById);

  return (
    <>
      {showInitialLoading && (
        <Loader mx='auto' my='xl' size='lg' />
      )}
      {!showInitialLoading && !hasDeflections && (
        <>
          <Box bdrs='50%' bg='gray.1' w='160px' h='160px' mx='auto' />
          <Box align='center'>
            <Title order={4}>You don't have any past holds</Title>
            <Text size='md' c='dimmed'>Completed, canceled, and expired holds will show up here.</Text>
          </Box>
        </>
      )}
      {hasDeflections && (
        <>
          <Stack gap='md'>
            {shouldShowCurrentIncidentGroup && currentIncidentDeflections.length > 0 && (
              <IncidentGroup incident={incident} incidentId={incident?.id} gap='xs'>
                {[...currentIncidentDeflections]
                  .sort((a, b) => getDeflectionActivityMs(b) - getDeflectionActivityMs(a))
                  .map((deflection) => (
                    <Hold
                      key={deflection.id}
                      deflection={deflection}
                      isHistory
                      isHandedOff={!!currentUserId && !!deflection.currentOfficerId && deflection.currentOfficerId !== currentUserId}
                      onDetailsClick={() => {
                        navigate(`/holds/${deflection.id}`);
                      }}
                    />
                  ))}
              </IncidentGroup>
            )}
            {groupedByIncident.map((group) => (
              <IncidentGroup key={`incident-${group.incidentId}`} incident={group.incident} incidentId={group.incidentId} gap='xs'>
                {group.deflections.map((deflection) => (
                  <Hold
                    incident={incident}
                    key={deflection.id}
                    deflection={deflection}
                    isHistory
                    isHandedOff={!!currentUserId && !!deflection.currentOfficerId && deflection.currentOfficerId !== currentUserId}
                    onDetailsClick={() => {
                      navigate(`/holds/${deflection.id}`);
                    }}
                  />
                ))}
              </IncidentGroup>
            ))}
          </Stack>
        </>
      )}
    </>
  );
}

export default HoldsHistory;
