import { useNavigate } from 'react-router';
import { Box, Stack, Title, Text, Loader } from '@mantine/core';

import Hold from './Hold';
import IncidentGroup from './IncidentGroup';
import { groupDeflectionsByIncident, isInitialLoading } from './holdsViewModel';

function HoldsHistory ({ deflections, isFetchingDeflections = false, currentUserId }) {
  const navigate = useNavigate();
  const showInitialLoading = isInitialLoading(isFetchingDeflections, deflections);
  const hasDeflections = (deflections?.length ?? 0) > 0;

  // Each deflection arrives with its own `incident` embedded (server-side
  // include when `scope=history&includeIncident=true`), so we build the
  // id → incident map straight from the response, no per-incident fetches.
  const incidentsById = (deflections ?? []).reduce((acc, deflection) => {
    if (deflection.incident && !acc[deflection.incidentId]) {
      acc[deflection.incidentId] = deflection.incident;
    }
    return acc;
  }, {});

  const groupedByIncident = groupDeflectionsByIncident(deflections ?? [], incidentsById);

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
        <Stack gap='md'>
          {groupedByIncident.map((group) => (
            <IncidentGroup key={`incident-${group.incidentId}`} incident={group.incident} incidentId={group.incidentId} gap='xs'>
              {group.deflections.map((deflection) => (
                <Hold
                  key={deflection.id}
                  deflection={deflection}
                  isHistory
                  isHandedOff={!!deflection.wasHandedOffByMe && deflection.currentOfficerId !== currentUserId}
                  onDetailsClick={() => {
                    navigate(`/holds/${deflection.id}`);
                  }}
                />
              ))}
            </IncidentGroup>
          ))}
        </Stack>
      )}
    </>
  );
}

export default HoldsHistory;
