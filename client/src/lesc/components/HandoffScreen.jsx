import { useEffect, useRef, useState } from 'react';
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

function HandoffScreen () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  const [handedOffIds, setHandedOffIds] = useState(new Set());
  const initialHoldIdsRef = useRef(null);

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

  // Flatten all active deflections from all incidents
  const currentDeflections = (myHolds?.incidents ?? []).flatMap(inc => inc.deflections);

  // Track which holds have been handed off (disappeared from the response)
  useEffect(() => {
    if (!currentDeflections.length && !initialHoldIdsRef.current) return;

    const currentIds = new Set(currentDeflections.map(d => d.id));

    if (!initialHoldIdsRef.current) {
      initialHoldIdsRef.current = currentIds;
      return;
    }

    // Any ID that was in the initial set but is no longer in the response has been handed off
    const newlyHandedOff = new Set(handedOffIds);
    for (const id of initialHoldIdsRef.current) {
      if (!currentIds.has(id)) {
        newlyHandedOff.add(id);
      }
    }
    if (newlyHandedOff.size !== handedOffIds.size) {
      setHandedOffIds(newlyHandedOff);
    }
  }, [currentDeflections]);

  // Redirect when all holds have been handed off
  const allHandedOff = initialHoldIdsRef.current &&
    initialHoldIdsRef.current.size > 0 &&
    currentDeflections.length === 0 &&
    handedOffIds.size > 0;

  useEffect(() => {
    if (allHandedOff) navigate('/holds');
  }, [allHandedOff, navigate]);

  // Build the display list: current holds + handed-off holds (from initial snapshot)
  const handedOffDeflections = initialHoldIdsRef.current
    ? [...initialHoldIdsRef.current]
      .filter(id => handedOffIds.has(id))
      .map(id => ({ id, _handedOff: true }))
    : [];

  // We don't have full deflection data for handed-off holds anymore,
  // so we store the initial deflections for display
  const initialDeflectionsRef = useRef(new Map());
  useEffect(() => {
    for (const d of currentDeflections) {
      if (!initialDeflectionsRef.current.has(d.id)) {
        initialDeflectionsRef.current.set(d.id, d);
      }
    }
  }, [currentDeflections]);

  const allDisplayDeflections = [
    ...currentDeflections,
    ...[...handedOffIds].map(id => initialDeflectionsRef.current.get(id)).filter(Boolean),
  ];

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

          <Stack gap='md'>
            {allDisplayDeflections.map((deflection) => (
              <HandoffHoldCard
                key={deflection.id}
                deflection={deflection}
                isHandedOff={handedOffIds.has(deflection.id)}
              />
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
