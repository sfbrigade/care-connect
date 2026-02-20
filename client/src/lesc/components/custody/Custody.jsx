import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Box, Button, Container, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import EmptyState from './EmptyState';
import StatusAccordion from './StatusAccordion';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { IconQrcode } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { formatTime } from '@/utils/format';
import ScanTransferCodeModal from './ScanTransferCodeModal';

const IN_CUSTODY_STATUSES = 'AWAITING_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR';
const RELEASED_STATUSES = 'RELEASED,EXITED';

const IN_CUSTODY_SECTIONS = [
  { status: 'AWAITING_INTAKE', label: 'Pending Safety Checks', description: 'Update subject details as needed before completing the safety check.' },
  { status: 'READY_FOR_INTAKE', label: 'Ready for Medical Intake' },
  { status: 'ADMITTED', label: 'In Medical Intake' },
  { status: 'IN_CHAIR', label: 'In-chair' },
];

const RELEASED_SECTIONS = [
  { status: 'RELEASED', label: 'Still onsite' },
  { status: 'EXITED', label: 'Exited facility' },
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
  const [highlightedId, setHighlightedId] = useState(null);
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();

  const { data: inCustodyDeflections, dataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'in-custody'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: IN_CUSTODY_STATUSES }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: releasedDeflections } = useQuery({
    queryKey: ['deflections', facility.id, 'released'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: RELEASED_STATUSES }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  function handleScanSuccess () {
    queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
  }

  useEffect(() => {
    if (!inCustodyDeflections && !releasedDeflections) return;
    const targetId = window.sessionStorage.getItem('custodyScrollTarget');
    if (!targetId) return;
    window.sessionStorage.removeItem('custodyScrollTarget');
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`custody-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ block: 'center' });
      }
    });
  }, [inCustodyDeflections, releasedDeflections]);

  useEffect(() => {
    if (!inCustodyDeflections && !releasedDeflections) return;
    const targetId = window.sessionStorage.getItem('custodyHighlightTarget');
    if (!targetId) return;
    window.sessionStorage.removeItem('custodyHighlightTarget');
    setHighlightedId(targetId);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`custody-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [inCustodyDeflections, releasedDeflections]);

  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const inCustodyGrouped = groupByStatus(inCustodyDeflections);
  const releasedGrouped = groupByStatus(releasedDeflections);
  const hasInCustody = (inCustodyDeflections?.length ?? 0) > 0;

  const defaultOpenSections = IN_CUSTODY_SECTIONS
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
                  <StatusAccordion
                    sections={IN_CUSTODY_SECTIONS}
                    groupedDeflections={inCustodyGrouped}
                    defaultOpen={defaultOpenSections}
                  />
                  )
                : (
                  <EmptyState
                    title='No subjects in custody'
                    description="When you receive a subject from SFPD, they'll appear here."
                  />
                  )}
            </Stack>
          )}
          {tab === 'released' && (
            <Stack gap='md'>
              {(releasedDeflections?.length ?? 0) > 0
                ? (
                  <StatusAccordion
                    sections={RELEASED_SECTIONS}
                    groupedDeflections={releasedGrouped}
                    defaultOpen={['RELEASED', 'EXITED']}
                  />
                  )
                : (
                  <EmptyState
                    title='No subjects in released'
                    description="Released subjects appear here, but those who exit the facility will disappear from view after 24 hours. They're retained in legal records."
                  />
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
