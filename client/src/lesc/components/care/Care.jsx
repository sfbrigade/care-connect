import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Box, Button, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { IconQrcode } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { formatTime } from '@/utils/format';
import CareCard from './CareCard';
import ScanAdmitCodeModal from './ScanAdmitCodeModal';

const CARE_STATUSES = 'ADMITTED,IN_CHAIR';

const SECTIONS = [
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

function Care () {
  const [scanModalOpened, setScanModalOpened] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();

  const { data: deflections, dataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'care'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: CARE_STATUSES }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  function handleScanSuccess () {
    queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
  }

  useEffect(() => {
    if (!deflections) return;
    const targetId = window.sessionStorage.getItem('careHighlightTarget');
    if (!targetId) return;
    window.sessionStorage.removeItem('careHighlightTarget');
    setHighlightedId(targetId);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`care-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [deflections]);

  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const grouped = groupByStatus(deflections);
  const hasDeflections = (deflections?.length ?? 0) > 0;

  const defaultOpenSections = SECTIONS
    .filter(s => (grouped[s.status]?.length ?? 0) > 0)
    .map(s => s.status);

  return (
    <>
      <Head>
        <title>Care</title>
      </Head>
      <Container pt='md'>
        <Stack gap='xl'>
          <Stack gap='md'>
            {hasDeflections
              ? (
                <Accordion variant='section' multiple defaultValue={defaultOpenSections}>
                  <Divider />
                  {SECTIONS.map(({ status, label }) => {
                    const items = grouped[status] ?? [];
                    return (
                      <Accordion.Item key={status} value={status}>
                        <Accordion.Control>
                          <Title order={3}>{label}: {items.length}</Title>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap='md'>
                            {items.map(d => (
                              <CareCard key={d.id} deflection={d} highlighted={String(d.id) === highlightedId} />
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
                  <Title order={3}>No admitted subjects</Title>
                  <Text c='dimmed' ta='center'>When you admit a subject, they&apos;ll appear here.</Text>
                </Stack>
                )}
          </Stack>
        </Stack>
      </Container>
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
              Scan an admit code
            </Button>
            {dataUpdatedAt > 0 && (
              <Group justify='center'>
                <Text size='sm' c='dimmed'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
              </Group>
            )}
          </Stack>
        </Container>
      </Box>
      <ScanAdmitCodeModal
        opened={scanModalOpened}
        onClose={() => setScanModalOpened(false)}
        onSuccess={handleScanSuccess}
      />
    </>
  );
}

export default Care;
