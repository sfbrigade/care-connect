import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Accordion, Box, Button, Container, Divider, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { IconQrcode } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { formatTime } from '@/utils/format';
import CustodyCard from './CustodyCard';
import ScanTransferCodeModal from './ScanTransferCodeModal';

const IN_CUSTODY_STATUSES = 'AWAITING_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR';
const RELEASED_STATUSES = 'RELEASED,EXITED';

const SECTIONS = [
  { status: 'AWAITING_INTAKE', label: 'Pending Safety Checks', description: 'Update subject details as needed before completing the safety check.' },
  { status: 'READY_FOR_INTAKE', label: 'Ready for Medical Intake' },
  { status: 'ADMITTED', label: 'In Medical Intake' },
  { status: 'IN_CHAIR', label: 'In-chair' },
];

function groupByStatus (deflections) {
  const grouped = {};
  for (const d of deflections ?? []) {
    grouped[d.subjectStatus] ||= [];
    grouped[d.subjectStatus].push(d);
  }
  return grouped;
}

function Custody () {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'in-custody';
  const setTab = (value) => setSearchParams(value === 'in-custody' ? {} : { tab: value }, { replace: true });
  const [scanModalOpened, setScanModalOpened] = useState(false);
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();

  const { data: inCustodyDeflections, dataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'in-custody'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: IN_CUSTODY_STATUSES }).then(r => r.data),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: releasedDeflections } = useQuery({
    queryKey: ['deflections', facility.id, 'released'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: RELEASED_STATUSES }).then(r => r.data),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  function handleScanSuccess () {
    queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
  }

  useEffect(() => {
    if (!inCustodyDeflections && !releasedDeflections) return;
    const targetId = sessionStorage.getItem('custodyScrollTarget');
    if (!targetId) return;
    sessionStorage.removeItem('custodyScrollTarget');
    requestAnimationFrame(() => {
      const el = document.getElementById(`custody-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ block: 'center' });
      }
    });
  }, [inCustodyDeflections, releasedDeflections]);

  const inCustodyGrouped = groupByStatus(inCustodyDeflections);
  const releasedGrouped = groupByStatus(releasedDeflections);
  const hasInCustody = (inCustodyDeflections?.length ?? 0) > 0;

  const defaultOpenSections = SECTIONS
    .filter(s => (inCustodyGrouped[s.status]?.length ?? 0) > 0)
    .map(s => s.status);

  return (
    <>
      <Head>
        <title>Custody</title>
      </Head>
      <Container pt='md'>
        <Stack gap='xl'>
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'In Custody', value: 'in-custody' },
              { label: 'Released', value: 'released' },
            ]}
          />
          {tab === 'in-custody' && (
            <Stack gap='md'>
              {hasInCustody
                ? (
                  <Accordion variant='section' multiple defaultValue={defaultOpenSections}>
                    <Divider />
                    {SECTIONS.map(({ status, label, description }) => {
                      const items = inCustodyGrouped[status] ?? [];
                      return (
                        <Accordion.Item key={status} value={status}>
                          <Accordion.Control>
                            <Title order={3}>{label}: {items.length}</Title>
                            {description && <Text c='gray.5' size='sm'>{description}</Text>}
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap='md'>
                              {items.map(d => (
                                <CustodyCard key={d.id} deflection={d} />
                              ))}
                              {items.length === 0 && (
                                <Text c='dimmed' size='sm'>None</Text>
                              )}
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                  )
                : (
                  <Stack align='center' gap='md' py='xl'>
                    <Box
                      w={160}
                      h={160}
                      style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-2)' }}
                    />
                    <Title order={3}>No subjects in custody</Title>
                    <Text c='dimmed' ta='center'>When you receive a subject from SFPD, they'll appear here.</Text>
                  </Stack>
                  )}
            </Stack>
          )}
          {tab === 'released' && (
            <Stack gap='md'>
              {(releasedDeflections?.length ?? 0) > 0
                ? (
                  <Accordion variant='section' multiple defaultValue={['RELEASED', 'EXITED']}>
                    <Divider />
                    <Accordion.Item value='RELEASED'>
                      <Accordion.Control>
                        <Title order={3}>Still onsite: {releasedGrouped.RELEASED?.length ?? 0}</Title>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap='md'>
                          {(releasedGrouped.RELEASED ?? []).map(d => (
                            <CustodyCard key={d.id} deflection={d} />
                          ))}
                          {!(releasedGrouped.RELEASED?.length) && (
                            <Text c='dimmed' size='sm'>None</Text>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value='EXITED'>
                      <Accordion.Control>
                        <Title order={3}>Exited facility: {releasedGrouped.EXITED?.length ?? 0}</Title>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap='md'>
                          {(releasedGrouped.EXITED ?? []).map(d => (
                            <CustodyCard key={d.id} deflection={d} />
                          ))}
                          {!(releasedGrouped.EXITED?.length) && (
                            <Text c='dimmed' size='sm'>None</Text>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                  )
                : (
                  <Stack align='center' gap='md' py='xl'>
                    <Box
                      w={160}
                      h={160}
                      style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-2)' }}
                    />
                    <Title order={3}>No subjects in released</Title>
                    <Text c='dimmed' ta='center'>Released subjects appear here, but those who exit the facility will disappear from view after 24 hours. They&apos;re retained in legal records.</Text>
                  </Stack>
                  )}
            </Stack>
          )}
        </Stack>
      </Container>
      {tab === 'in-custody' && (
        <Box
          pos='sticky'
          bottom={0}
          bg='gray.0'
          pt='md'
          pb='xl'
          style={{ zIndex: 10 }}
        >
          <Container>
            <Stack gap='xs'>
              <Button
                variant='light'
                fullWidth
                size='lg'
                leftSection={<IconQrcode size={20} />}
                onClick={() => setScanModalOpened(true)}
              >
                Scan a custody transfer code
              </Button>
              {dataUpdatedAt > 0 && (
                <Group justify='center'>
                  <Text size='sm' c='dimmed'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
                </Group>
              )}
            </Stack>
          </Container>
        </Box>
      )}
      <ScanTransferCodeModal
        opened={scanModalOpened}
        onClose={() => setScanModalOpened(false)}
        onSuccess={handleScanSuccess}
      />
    </>
  );
}

export default Custody;
