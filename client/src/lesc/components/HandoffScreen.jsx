import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { formatSmartDateTime, calculateAge } from '@/utils/format';
import { isValidIncident } from '@/utils/validators';
import LockedQRCode from '@/components/LockedQRCode';
import ActionFooter from '@/components/ActionFooter';

import { useTranslation } from 'react-i18next';

function HandoffHoldCard ({ deflection, isHandedOff }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const displayId = String(deflection.id);
  const displayName = [
    deflection?.subject?.firstName,
    deflection?.subject?.middleInitial,
    deflection?.subject?.lastName,
  ].filter(Boolean).join(' ') || 'Unknown person';

  const subjectDetails = [];
  if (deflection?.subject?.dateOfBirth) {
    subjectDetails.push(`${calculateAge(deflection.subject.dateOfBirth)} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection.subject.sex}`));
  }

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

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(r => r.data),
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const { data: deflections } = useQuery({
    queryKey: ['deflections', incident?.id, 'active'],
    queryFn: () => Api.deflections.list({
      incidentId: incident.id,
      active: true,
    }).then(r => r.data),
    enabled: !!incident,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: handedOffDeflections } = useQuery({
    queryKey: ['deflections', incident?.id, 'handoff-screen-handed-off'],
    queryFn: () => Api.deflections.list({
      incidentId: incident.id,
      handedOff: true,
    }).then(r => r.data),
    enabled: !!incident,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const allHandedOff = !incident;
  const incidentComplete = incident ? isValidIncident(incident) : false;
  const address = incident
    ? `${incident.addressLine1 ?? ''}${incident.addressLine2 ? `, ${incident.addressLine2}` : ''}`
    : '';

  const handedOffIds = new Set((handedOffDeflections ?? []).map(d => d.id));
  const allDeflections = [
    ...(deflections ?? []),
    ...(handedOffDeflections ?? []),
  ];

  useEffect(() => {
    if (allHandedOff || (incident && !incidentComplete)) navigate('/holds');
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

          {incident && (
            <>
              <Stack gap='xs'>
                <Text size='md' c='indigo.6'>Hand off incident to officer</Text>
                <Title order={3}>
                  Ask the receiving Officer to scan the code for each person you want to hand off.
                </Title>
              </Stack>

              <Text size='md'>Incident {incident.id}</Text>

              <Text size='md' c='dimmed'>
                {address || 'Address unavailable'} • {incident.arrestedAt ? formatSmartDateTime(incident.arrestedAt) : 'Time unavailable'}
              </Text>

              <Stack gap='md'>
                {allDeflections.map((deflection) => (
                  <HandoffHoldCard
                    key={deflection.id}
                    deflection={deflection}
                    isHandedOff={handedOffIds.has(deflection.id)}
                  />
                ))}
              </Stack>
            </>
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
