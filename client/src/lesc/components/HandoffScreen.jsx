import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { formatSmartDateTime } from '@/utils/format';
import LockedQRCode from '@/components/LockedQRCode';
import ActionFooter from '@/components/ActionFooter';
import useSubjectDetails from '@/hooks/useSubjectDetails';

function HandoffHoldCard ({ deflection, isHandedOff }) {
  const navigate = useNavigate();
  const displayId = String(deflection.id);
  const displayName = [
    deflection?.subject?.firstName,
    deflection?.subject?.middleInitial,
    deflection?.subject?.lastName,
  ].filter(Boolean).join(' ') || 'Unknown person';
  const subjectDetails = useSubjectDetails(deflection?.subject);

  const handoffUrl = `${window.location.origin}/handoff/${deflection.id}`;

  return (
    <Card bg='white' p='xl' withBorder>
      <Stack gap='md' align='center'>
        <Group gap='xs' w='100%'>
          <Text size='md' c='gray.6'>Hold {displayId}</Text>
          {isHandedOff && (
            <>
              <Text size='md' c='gray.5'>•</Text>
              <Text size='md' c='teal.6'>Handed off</Text>
            </>
          )}
        </Group>
        <Box w='100%'>
          <Title order={3}>{displayName}</Title>
          {subjectDetails.length > 0 && (
            <Text size='md'>{subjectDetails.join(', ')}</Text>
          )}
        </Box>
        <Stack align='center' gap='xs'>
          <LockedQRCode
            value={handoffUrl}
            variant={isHandedOff ? 'handedOff' : undefined}
          />
          <Text size='sm' c='dimmed'>Handoff code: {deflection.id}</Text>
        </Stack>
        <Group justify='flex-end' w='100%'>
          <Button
            variant='secondary'
            size='md'
            onClick={() => navigate(`/holds/${deflection.id}`)}
          >
            View details
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function formatIncidentSubtitle (incident) {
  const address = [incident.addressLine1, incident.addressLine2].filter(Boolean).join(', ');
  const time = incident.arrestedAt ? formatSmartDateTime(incident.arrestedAt) : 'Time unavailable';
  return `${address || 'Address unavailable'} • ${time}`;
}

function HandoffScreen () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  const seenIncidentsRef = useRef(new Map());
  const seenDeflectionsRef = useRef(new Map());

  useEffect(() => {
    Api.deflections.initiateHandoff(true);
    const interval = setInterval(() => {
      Api.deflections.initiateHandoff(true);
    }, 60_000);
    return () => {
      clearInterval(interval);
      Api.deflections.initiateHandoff(false);
    };
  }, []);

  const { data: myHolds } = useQuery({
    queryKey: ['facilities', facility.id, 'my-holds'],
    queryFn: () => Api.facilities.myHolds(facility.id).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  // Cache incidents and deflections as we see them so a handed-off hold's card
  // (and its incident header) stays rendered after it disappears from the response.
  useEffect(() => {
    if (!myHolds?.incidents) return;
    for (const inc of myHolds.incidents) {
      if (!seenIncidentsRef.current.has(inc.id)) {
        seenIncidentsRef.current.set(inc.id, inc);
      }
      for (const d of inc.deflections) {
        if (!seenDeflectionsRef.current.has(d.id)) {
          seenDeflectionsRef.current.set(d.id, { deflection: d, incidentId: inc.id });
        }
      }
    }
  }, [myHolds]);

  // IDs of holds this officer currently still controls
  const currentIds = new Set(
    (myHolds?.incidents ?? []).flatMap(inc => inc.deflections.map(d => d.id))
  );

  // Build incident-grouped display:
  //   - current holds come from myHolds (fresh data)
  //   - handed-off holds are supplemented from the cached snapshot
  const groupsMap = new Map();
  for (const inc of (myHolds?.incidents ?? [])) {
    if (!groupsMap.has(inc.id)) {
      groupsMap.set(inc.id, { incident: inc, deflections: [] });
    }
    for (const d of inc.deflections) {
      groupsMap.get(inc.id).deflections.push(d);
    }
  }
  for (const [deflId, { deflection, incidentId }] of seenDeflectionsRef.current) {
    if (currentIds.has(deflId)) continue;
    const incident = seenIncidentsRef.current.get(incidentId);
    if (!incident) continue;
    if (!groupsMap.has(incidentId)) {
      groupsMap.set(incidentId, { incident, deflections: [] });
    }
    groupsMap.get(incidentId).deflections.push(deflection);
  }
  const groups = [...groupsMap.values()];

  // Redirect when everything we had at first has been handed off
  const allHandedOff = seenDeflectionsRef.current.size > 0 && currentIds.size === 0;
  useEffect(() => {
    if (allHandedOff) navigate('/holds');
  }, [allHandedOff, navigate]);

  return (
    <>
      <Head>
        <title>Handoff</title>
      </Head>
      <Container pt='md' pb='xl'>
        <Stack gap='lg'>
          <Group gap='sm'>
            <Button
              variant='subtle'
              c='gray.7'
              p={0}
              onClick={() => navigate('/holds')}
            >
              <IconArrowLeft size={24} />
            </Button>
          </Group>

          <Stack gap='xs'>
            <Text size='md' c='indigo.6'>Hand off holds to another officer</Text>
            <Title order={3}>
              Ask the receiving Officer to scan the code for each person you want to hand off.
            </Title>
          </Stack>

          <Stack gap='xl'>
            {groups.map(({ incident, deflections }) => (
              <Stack key={incident.id} gap='md'>
                <Stack gap={4}>
                  <Text size='md'>Incident {incident.id}</Text>
                  <Text size='md' c='dimmed'>{formatIncidentSubtitle(incident)}</Text>
                </Stack>
                {deflections.map(deflection => (
                  <HandoffHoldCard
                    key={deflection.id}
                    deflection={deflection}
                    isHandedOff={!currentIds.has(deflection.id)}
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Container>
      <ActionFooter>
        <Button onClick={() => navigate('/holds')}>
          Done
        </Button>
      </ActionFooter>
      <Box h='120px' />
    </>
  );
}

export default HandoffScreen;
