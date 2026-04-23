import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Container, SegmentedControl, Stack, Text } from '@mantine/core';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';

import Api from '@/Api';
import ActionFooter from '@/components/ActionFooter';
import FacilityStatusBanner from '@/components/FacilityStatusBanner';
import ScanTransferCodeIcon from '@/components/ScanTransferCodeIcon';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import useSessionState from '@/hooks/useSessionState';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';
import { formatTime } from '@/utils/format';

import ChairAvailabilityCard from '../ChairAvailabilityCard';
import EmptyState from '../EmptyState';
import StatusAccordion from '@/components/StatusAccordion';
import CustodyCard from './CustodyCard';

import ScanTransferCodeModal from './ScanTransferCodeModal';
import { RELEASE_TOAST_KEY } from './LegalReleaseQuestions';

const IN_CUSTODY_STATUSES = 'AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR';
const RELEASED_STATUSES = 'RELEASED,EXITED';

const IN_CUSTODY_SECTIONS = [
  { status: 'AWAITING_INTAKE', label: 'Pending Safety Checks', tooltip: 'People waiting for a safety check. Mark complete when safety check is done.' },
  { status: 'READY_FOR_INTAKE', label: 'Ready for Medical Intake', tooltip: 'Ready to start process of medical admission. Show the QR code to Connections staff.' },
  { status: 'ADMITTED', label: 'In Medical Intake', tooltip: 'Medical admission in process. Monitor status until person is admitted.' },
  { status: 'IN_CHAIR', label: 'In-chair', tooltip: 'People currently occupying sobering chairs. Start legal release when they are ready.' },
];

const RELEASED_SECTIONS = [
  { status: 'RELEASED', label: 'Still onsite', tooltip: 'People are legally released but still in chair or otherwise onsite.' },
  { status: 'EXITED_FACILITY', label: 'Exited facility', tooltip: 'People who have left the facility within the last 24 hours.' },
  { status: 'TRANSFERRED_TO_JAIL', label: 'Transferred to jail', tooltip: 'People who have left the facility for jail within the last 24 hours.' },
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
  function isTransferredToJail (deflection) {
    return (
      deflection?.subjectStatus === 'EXITED' &&
      deflection?.exitDestinationId === 'jail'
    );
  }

  function isTransferredToHospital (deflection) {
    return (
      deflection?.subjectStatus === 'EXITED' &&
      deflection?.exitDestinationId === 'hospital' &&
      !deflection?.releasedAt
    );
  }

  return {
    RELEASED: (deflections ?? []).filter(d => d.subjectStatus === 'RELEASED'),
    EXITED_FACILITY: (deflections ?? []).filter(
      d => d.subjectStatus === 'EXITED' &&
        !isTransferredToJail(d) &&
        !isTransferredToHospital(d)
    ),
    TRANSFERRED_TO_JAIL: (deflections ?? []).filter(
      d => isTransferredToJail(d)
    ),
    TRANSFERRED_TO_HOSPITAL: (deflections ?? []).filter(
      d => isTransferredToHospital(d)
    ),
  };
}

function Custody () {
  const [tab, setTab] = useSessionState('custody', 'in-custody');
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

  const { data: releasedDeflections, dataUpdatedAt: releasedDataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'released'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: RELEASED_STATUSES }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
    ...facilityLiveQueryOptions,
  });

  function handleScanSuccess () {
    setTab('in-custody');
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
    if (tab !== 'released' || !highlightedId) return;
    const el = document.getElementById(`custody-card-${highlightedId}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const isVisible = (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
      );
      // prevent page 'jumping' if the card is already visible and only scroll if not visible
      if (!isVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [tab, highlightedId, releasedDeflections]);

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
  const availableChairs = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.available ?? 0), 0);
  const inTransitCount = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.inTransit ?? 0), 0);
  const occupiedCount = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.occupied ?? 0), 0);

  useEffect(() => {
    if (!inCustodyDeflections) return;

    const sectionTarget = window.sessionStorage.getItem('custodyInCustodySectionTarget');
    if (!sectionTarget) return;
    window.sessionStorage.removeItem('custodyInCustodySectionTarget');

    sectionScrolledRef.current = true;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`custody-section-${sectionTarget}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [inCustodyDeflections]);

  return (
    <>
      <Head>
        <title>Custody</title>
      </Head>
      <Container pt='md'>
        <Stack gap='xl'>
          <ChairAvailabilityCard
            availableChairs={availableChairs}
            inTransitCount={inTransitCount}
            occupiedCount={occupiedCount}
          />
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'In custody', value: 'in-custody' },
              { label: 'Legally released', value: 'released' },
            ]}
          />
          <FacilityStatusBanner />
          {tab === 'in-custody' && (
            <Stack gap='md'>
              {hasInCustody
                ? (
                  <StatusAccordion
                    sections={IN_CUSTODY_SECTIONS}
                    groupedItems={inCustodyGrouped}
                    renderCard={(d) => <CustodyCard key={d.id} deflection={d} highlighted={String(d.id) === highlightedId} />}
                  />
                  )
                : (
                  <EmptyState
                    title='No persons In Custody'
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
                    groupedItems={releasedGrouped}
                    renderCard={(d) => <CustodyCard key={d.id} deflection={d} highlighted={String(d.id) === highlightedId} />}
                  />
                  )
                : (
                  <EmptyState
                    title='No persons in Released'
                    description="Released persons appear here, but those who exit the facility will disappear from view after 24 hours. They're retained in legal records."
                    updatedAt={releasedDataUpdatedAt}
                  />
                  )}
            </Stack>
          )}
          {tab === 'in-custody' && dataUpdatedAt > 0 && (
            <Text size='xs' c='gray.5' ta='center'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
          )}
        </Stack>
      </Container>
      <ActionFooter>
        <Button
          variant='secondary'
          leftSection={<ScanTransferCodeIcon size={20} color='var(--mantine-color-indigo-6)' />}
          onClick={() => setScanModalOpened(true)}
        >
          Take custody
        </Button>
      </ActionFooter>
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
