import { useNavigate } from 'react-router';
import { Box, Stack, Title, Text, Loader } from '@mantine/core';
import { useQuery, useQueries } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import Api from '@/Api';
import Hold from './Hold';
import { formatAddress } from '@/utils/format';

function HoldsHistory({ facility }) {
  const navigate = useNavigate();

  const { data: deflections, isFetching: isFetchingDeflections } = useQuery({
    queryKey: ['deflections', facility?.id, 'inactive'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, active: false }).then(response => response.data),
    enabled: !!facility,
  });

  // Coerce once at the top
  const safeDeflections = deflections ?? [];

  // Single-pass partition: collect cancelled IDs, group cancelled, and separate non-cancelled
  const { cancelledIncidentIds, cancelledByIncident, nonCancelledDeflections } =
    safeDeflections.reduce(
      (acc, deflection) => {
        if (deflection.status === 'CANCELLED') {
          acc.cancelledIncidentIds.add(deflection.incidentId);

          if (!acc.cancelledByIncident[deflection.incidentId]) {
            acc.cancelledByIncident[deflection.incidentId] = [];
          }
          acc.cancelledByIncident[deflection.incidentId].push(deflection);
        } else {
          acc.nonCancelledDeflections.push(deflection);
        }
        return acc;
      },
      { cancelledIncidentIds: new Set(), cancelledByIncident: {}, nonCancelledDeflections: [] }
    );

  const cancelledIncidentIdList = [...cancelledIncidentIds];

  const incidentQueries = useQueries({
    queries: cancelledIncidentIdList.map((incidentId) => ({
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

  const cancelledGroups = Object.entries(cancelledByIncident)
    .map(([incidentId, incidentDeflections]) => ({
      incidentId,
      incident: incidentsById[incidentId],
      deflections: incidentDeflections,
      latestCancelledAtMs: incidentDeflections
        .map((deflection) =>
          deflection.cancelledAt ? DateTime.fromISO(deflection.cancelledAt).toMillis() : 0
        )
        .sort((a, b) => b - a)[0] ?? 0,
    }))
    .sort((a, b) => b.latestCancelledAtMs - a.latestCancelledAtMs);

  return (
    <>
      {isFetchingDeflections && (
        <Loader mx='auto' my='xl' size='lg' />
      )}
      {!isFetchingDeflections && (!deflections || deflections.length === 0) && (
        <>
          <Box bdrs='50%' bg='gray.1' w='160px' h='160px' mx='auto' />
          <Box align='center'>
            <Title order={4}>You don't have any past holds</Title>
            <Text size='md' c='dimmed'>Completed, cancelled, and expired holds will show up here.</Text>
          </Box>
        </>
      )}
      {!isFetchingDeflections && deflections && deflections.length > 0 && (
        <>
          <Stack gap='md'>
            {cancelledGroups.map((group) => {
              const address = group.incident ? formatAddress(group.incident) : '';

              return (
                <Stack key={`incident-${group.incidentId}`} gap='xs'>
                  <Box>
                    <Text size='lg'>Incident {String(group.incidentId).padStart(6, '0')}</Text>
                    {(address || group.incident?.arrestedAt) && (
                      <Text size='md' c='dimmed'>
                        {address}
                        {address && group.incident?.arrestedAt ? ' • ' : ''}
                        {group.incident?.arrestedAt
                          ? DateTime.fromISO(group.incident.arrestedAt).toLocaleString(DateTime.TIME_SIMPLE)
                          : ''}
                      </Text>
                    )}
                  </Box>
                  {group.deflections.map((deflection) => (
                    <Hold
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
            {nonCancelledDeflections.map((deflection) => (
              <Hold
                key={deflection.id}
                deflection={deflection}
                onDetailsClick={() => {
                  navigate(`/holds/${deflection.id}`);
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </>
  );
}

export default HoldsHistory;
