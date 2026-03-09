import { useNavigate } from 'react-router';
import { Box, Stack, Title, Text, Loader } from '@mantine/core';
import { useQueries } from '@tanstack/react-query';

import Hold from './Hold';
import Incident from './Incident';
import Api from '@/Api';
import { buildIncidentSubtitle, getDeflectionActivityMs, groupDeflectionsByIncident, isInitialLoading, splitCurrentIncidentDeflections } from './holdsViewModel';

function HoldsHistory ({ deflections, isFetchingDeflections = false, incident, hasActiveHolds = false }) {
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

  // Derive ID from queryKey
  const incidentsById = incidentQueries.reduce((acc, query) => {
    const incidentId = query.queryKey?.[1];
    if (query.data && incidentId) {
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
            <Text size='md' c='dimmed'>Completed, cancelled, and expired holds will show up here.</Text>
          </Box>
        </>
      )}
      {hasDeflections && (
        <>
          <Stack gap='md'>
            {shouldShowCurrentIncidentGroup && currentIncidentDeflections.length > 0 && (
              <Stack gap='xs'>
                <Incident incident={incident} editLink='/incident' />
                {[...currentIncidentDeflections]
                  .sort((a, b) => getDeflectionActivityMs(b) - getDeflectionActivityMs(a))
                  .map((deflection) => (
                    <Hold
                      key={deflection.id}
                      deflection={deflection}
                      onDetailsClick={() => {
                        navigate(`/holds/${deflection.id}`);
                      }}
                    />
                  ))}
              </Stack>
            )}
            {groupedByIncident.map((group) => {
              const subtitle = buildIncidentSubtitle(group.incident);

              return (
                <Stack key={`incident-${group.incidentId}`} gap='xs'>
                  <Box>
                    <Text size='md'>Incident {String(group.incidentId).padStart(6, '0')}</Text>
                    <Text size='md' c='dimmed'>{subtitle}</Text>
                  </Box>
                  {group.deflections.map((deflection) => (
                    <Hold
                      incident={incident}
                      key={deflection.id}
                      deflection={deflection}
                      onDetailsClick={() => {
                        navigate(`/holds/${deflection.id}`);
                      }}
                    />
                  ))}
                </Stack>
              );
            })}
          </Stack>
        </>
      )}
    </>
  );
}

export default HoldsHistory;
