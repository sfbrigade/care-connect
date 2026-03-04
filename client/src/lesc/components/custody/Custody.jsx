import { useEffect, useRef, useState } from 'react';
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
import { useToast } from '@/components/ToastContext';
import { formatTime } from '@/utils/format';
import ScanTransferCodeModal from './ScanTransferCodeModal';
import { RELEASE_TOAST_KEY } from './LegalReleaseQuestions';

const IN_CUSTODY_STATUSES = 'AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR';
const RELEASED_STATUSES = 'RELEASED,EXITED';

const IN_CUSTODY_SECTIONS = [
  { status: 'AWAITING_INTAKE', label: 'Pending Safety Checks', description: 'Update person details as needed before completing the safety check.' },
  { status: 'READY_FOR_INTAKE', label: 'Ready for Medical Intake' },
  { status: 'ADMITTED', label: 'In Medical Intake' },
  { status: 'IN_CHAIR', label: 'In-chair' },
];

const RELEASED_SECTIONS = [
  { status: 'RELEASED', label: 'Still onsite' },
  { status: 'EXITED_FACILITY', label: 'Exited facility', description: 'In the last 24 hours.' },
  { status: 'TRANSFERRED_TO_JAIL', label: 'Transferred to jail', description: 'Exited without legal release. Visible for 24 hours.' },
];

function groupByStatus (deflections) {
  const grouped = {};
  for (const d of deflections ?? []) {
    const status = d.subjectStatus === 'FAILED_INTAKE'
      ? 'AWAITING_INTAKE'
      : d.subjectStatus;
    grouped[status] ||= [];
    grouped[status].push(d);
  }
  return grouped;
}

function groupReleasedByStatus (deflections) {
  function isTransferredToJailWithoutLegalRelease (deflection) {
    return (
      deflection?.subjectStatus === 'EXITED' &&
      deflection?.exitDestinationId === 'jail' &&
      !deflection?.releasedAt
    );
  }

  return {
    RELEASED: (deflections ?? []).filter(d => d.subjectStatus === 'RELEASED'),
    EXITED_FACILITY: (deflections ?? []).filter(
      d => d.subjectStatus === 'EXITED' && !isTransferredToJailWithoutLegalRelease(d)
    ),
    TRANSFERRED_TO_JAIL: (deflections ?? []).filter(
      d => isTransferredToJailWithoutLegalRelease(d)
    ),
  };
}

function Custody () {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'in-custody';
  const setTab = (value) => setSearchParams(value === 'in-custody' ? {} : { tab: value }, { replace: true });
  const [scanModalOpened, setScanModalOpened] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const seenFailedIntakeIdsRef = useRef(new Set());
  const initializedFailedIntakeRef = useRef(false);
  const sectionScrolledRef = useRef(false);

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
    if (sectionScrolledRef.current) {
      sectionScrolledRef.current = false;
      return;
    }
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`custody-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [inCustodyDeflections, releasedDeflections]);

  useEffect(() => {
    if (!releasedDeflections) return;
    const sectionTarget = window.sessionStorage.getItem('custodyReleasedSectionTarget');
    if (!sectionTarget) return;
    window.sessionStorage.removeItem('custodyReleasedSectionTarget');
    sectionScrolledRef.current = true;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`custody-section-${sectionTarget}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [releasedDeflections]);

  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  useEffect(() => {
    const payload = window.sessionStorage.getItem(RELEASE_TOAST_KEY);
    if (!payload) return;
    window.sessionStorage.removeItem(RELEASE_TOAST_KEY);
    try {
      const parsed = JSON.parse(payload);
      showToast(parsed.title, parsed.variant, 4000, parsed.body);
    } catch {
      showToast('Couldn\'t save release', 'warning', 4000, 'Please check your connection and try again.');
    }
  }, [showToast]);

  useEffect(() => {
    if (!Array.isArray(inCustodyDeflections)) return;

    const currentFailed = inCustodyDeflections.filter(d => d.subjectStatus === 'FAILED_INTAKE');
    const previousSeen = seenFailedIntakeIdsRef.current;

    if (!initializedFailedIntakeRef.current) {
      seenFailedIntakeIdsRef.current = new Set(currentFailed.map(d => d.id));
      initializedFailedIntakeRef.current = true;
      return;
    }

    for (const d of currentFailed) {
      if (previousSeen.has(d.id)) continue;
      const personName = [d?.subject?.firstName, d?.subject?.lastName].filter(Boolean).join(' ') || 'This person';
      showToast(
        `Intake not completed. ${personName} moved back. Please review their status before release or exit.`,
        'warning'
      );
    }

    seenFailedIntakeIdsRef.current = new Set(currentFailed.map(d => d.id));
  }, [inCustodyDeflections, showToast]);

  const inCustodyGrouped = groupByStatus(inCustodyDeflections);
  const releasedGrouped = groupReleasedByStatus(releasedDeflections);
  const hasInCustody = (inCustodyDeflections?.length ?? 0) > 0;
  const releasedSectionTarget = window.sessionStorage.getItem('custodyReleasedSectionTarget');

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
                    highlightedId={highlightedId}
                  />
                  )
                : (
                  <EmptyState
                    title='No persons in custody'
                    description="When you receive a person from SFPD, they'll appear here."
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
                    defaultOpen={releasedSectionTarget
                      ? [releasedSectionTarget]
                      : ['RELEASED', 'EXITED_FACILITY', 'TRANSFERRED_TO_JAIL']}
                    highlightedId={highlightedId}
                  />
                  )
                : (
                  <EmptyState
                    title='No persons in released'
                    description="Released persons appear here, but those who exit the facility will disappear from view after 24 hours. They're retained in legal records."
                  />
                  )}
            </Stack>
          )}
        </Stack>
      </Container>
      {tab === 'in-custody' && (
        <Box
          className='action-footer-gradient'
          pos='sticky'
          bottom={0}
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
      {scanModalOpened && (
        <ScanTransferCodeModal
          opened={scanModalOpened}
          onClose={() => setScanModalOpened(false)}
          onSuccess={handleScanSuccess}
        />
      )}
    </>
  );
}

export default Custody;
