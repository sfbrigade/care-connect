import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft } from '@tabler/icons-react';
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
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isReadyRef = useRef(false);
  const cancelledRef = useRef(false);

  // Don't clear handoffReadyAt on unmount. The cleanup `initiateHandoff(false)`
  // races with the mount's `initiateHandoff(true)` (StrictMode double-mount,
  // or a prior visit's in-flight cleanup landing after the next visit's
  // init), leaving the deflection un-claimable until the field user retries.
  // The 3-min HANDOFF_READY_TTL on the server expires it naturally.
  const initiate = useCallback(() => {
    setHasError(false);
    return Api.deflections.initiateHandoff(true)
      .then(() => {
        if (cancelledRef.current) return;
        isReadyRef.current = true;
        setIsReady(true);
      })
      .catch(() => {
        if (cancelledRef.current) return;
        // Only surface the error if we never succeeded — once the QR is
        // visible, a transient interval failure shouldn't yank it.
        if (!isReadyRef.current) setHasError(true);
      });
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    initiate();
    const interval = setInterval(initiate, 60_000);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [initiate]);

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

          {isReady && (
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
          )}
          {!isReady && hasError && (
            <Alert color='red' icon={<IconAlertTriangle />} title="Couldn't prepare handoff">
              <Stack gap='sm' align='flex-start'>
                <Text size='sm'>Check your connection and try again.</Text>
                <Button variant='secondary' size='sm' onClick={initiate}>Retry</Button>
              </Stack>
            </Alert>
          )}
          {!isReady && !hasError && (
            <Center py='xl'>
              <Loader />
            </Center>
          )}
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
