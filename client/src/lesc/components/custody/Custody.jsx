import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Container, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { useNavigate } from 'react-router';

import Api from '@/Api';
import ActionFooter from '@/components/ActionFooter';
import FacilityStatusBanner from '@/components/FacilityStatusBanner';
import ScanTransferCodeIcon from '@/components/ScanTransferCodeIcon';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import useSessionState from '@/hooks/useSessionState';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';
import useNow from '@/hooks/useNow';
import useSubjectDetails from '@/hooks/useSubjectDetails';
import { formatTime, formatTimeRemaining } from '@/utils/format';
import { isValidDeflection, isValidIncident } from '@/utils/validators';

import ChairAvailabilityCard from '../ChairAvailabilityCard';
import EmptyState from '../EmptyState';
import StatusAccordion from '@/components/StatusAccordion';
import CustodyCard from './CustodyCard';

import ScanTransferCodeModal from './ScanTransferCodeModal';
import { RELEASE_TOAST_KEY } from './LegalReleaseQuestions';
import classes from './Custody.module.css';

const IN_CUSTODY_STATUSES = 'AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,IN_MEDICAL_INTAKE,IN_CHAIR';
const RELEASED_STATUSES = 'RELEASED,EXITED';
const TRANSIT_STATUSES = 'DETAINED,ONSITE_AWAITING_TRANSFER';

const IN_CUSTODY_SECTIONS = [
  { status: 'AWAITING_INTAKE', label: 'Pending Safety Checks', tooltip: 'People waiting for a safety check. Mark complete when safety check is done.' },
  { status: 'READY_FOR_INTAKE', label: 'Ready for Medical Intake', tooltip: 'Ready to start process of medical admission. Show the QR code to Connections staff.' },
  { status: 'IN_MEDICAL_INTAKE', label: 'In Medical Intake', tooltip: 'Medical intake in progress. Monitor status until intake is completed.' },
  { status: 'IN_CHAIR', label: 'In-chair', tooltip: 'People currently occupying chairs. Start legal release when medical staff indicate person is ready.' },
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
      deflection?.exitDestination === 'JAIL'
    );
  }

  function isTransferredToHospital (deflection) {
    return (
      deflection?.subjectStatus === 'EXITED' &&
      deflection?.exitDestination === 'HOSPITAL' &&
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

function officerDisplayName (officer) {
  const firstInitial = officer?.firstName ? `${officer.firstName.charAt(0)}.` : '';
  const name = [firstInitial, officer?.lastName].filter(Boolean).join(' ');
  if (!name) return 'Unknown officer';
  return officer?.badgeNumber ? `${name} #${officer.badgeNumber}` : name;
}

function groupTransitByOfficer (deflections) {
  const grouped = new Map();
  for (const deflection of deflections ?? []) {
    const officer = deflection.currentOfficer ?? deflection.createdBy;
    const officerId = officer?.id ?? 'unknown';
    if (!grouped.has(officerId)) {
      grouped.set(officerId, {
        officerId,
        officerName: officerDisplayName(officer),
        deflections: [],
      });
    }
    grouped.get(officerId).deflections.push(deflection);
  }
  return Array.from(grouped.values());
}

// Bubble groups containing any ONSITE_AWAITING_TRANSFER hold to the top, and
// within a (defensively-mixed) group, surface arrived holds first. Both sorts
// are stable, so existing newest-first ordering is preserved within each tier.
function sortByArrivedFirst (groups) {
  const isArrivedDeflection = (d) => d.subjectStatus === 'ONSITE_AWAITING_TRANSFER';
  const compareArrivedFirst = (a, b) => {
    const aArrived = isArrivedDeflection(a);
    const bArrived = isArrivedDeflection(b);
    if (aArrived === bArrived) return 0;
    return aArrived ? -1 : 1;
  };
  const groupsWithSortedDeflections = groups.map(group => ({
    ...group,
    deflections: [...group.deflections].sort(compareArrivedFirst),
  }));
  return groupsWithSortedDeflections.sort((a, b) => {
    const aHas = a.deflections.some(isArrivedDeflection);
    const bHas = b.deflections.some(isArrivedDeflection);
    if (aHas === bHas) return 0;
    return aHas ? -1 : 1;
  });
}

function TransitCustodyCard ({ deflection, highlighted }) {
  const displayId = String(deflection.id);
  const navigate = useNavigate();
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const subjectDetails = useSubjectDetails(deflection?.subject);
  const detailsComplete = isValidDeflection(deflection) && isValidIncident(deflection?.incident);
  const isArrived = deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER';
  const now = useNow(1000, !isArrived && !!deflection?.expiresAt && detailsComplete);

  return (
    <Card
      bg='white'
      p='xl'
      radius='lg'
      id={`custody-card-${deflection.id}`}
      className={highlighted ? classes.transitCardHighlighted : undefined}
    >
      <Stack gap='xl'>
        <Stack gap='xs'>
          <Group gap='xs' wrap='nowrap'>
            <Text size='md' c='gray.6'>Hold {displayId}</Text>
            {!detailsComplete && (
              <>
                <Text size='md' c='gray.4'>•</Text>
                <Text size='md' c='red.6' truncate>Details incomplete</Text>
              </>
            )}
            {isArrived && (
              <>
                <Text size='md' c='gray.4'>•</Text>
                <Text size='md' c='indigo.6' truncate>
                  {deflection.arrivedAt ? `Arrived at ${formatTime(deflection.arrivedAt)}` : 'Arrived'}
                </Text>
              </>
            )}
          </Group>
          <Stack gap={0}>
            <Title order={3}>{displayName}</Title>
            {subjectDetails.length > 0 && (
              <Text size='md'>{subjectDetails.join(', ')}</Text>
            )}
          </Stack>
        </Stack>
        {detailsComplete && (
          <Group gap='md' wrap='nowrap' justify={isArrived ? 'flex-end' : 'space-between'}>
            {!isArrived && (
              <Title order={4} fw={400}>
                {formatTimeRemaining(deflection.expiresAt, now) ?? ''}
              </Title>
            )}
            <Button
              variant='secondary'
              size='md'
              onClick={() => {
                window.sessionStorage.setItem('custodyScrollTarget', deflection.id);
                navigate(`/custody/${deflection.id}`);
              }}
            >
              Details
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}

function Custody () {
  const [tab, setTab] = useSessionState('custody', 'transit');
  const activeTab = tab === 'in-custody' ? 'custody' : tab;
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

  const { data: transitDeflections, dataUpdatedAt: transitDataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'transit'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: TRANSIT_STATUSES, status: 'ACTIVE', includeIncident: true, includeCurrentOfficer: true, perPage: 200 }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: releasedDeflections, dataUpdatedAt: releasedDataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'released'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: RELEASED_STATUSES, perPage: 200 }).then(r => r.data),
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
    setTab('custody');
    queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
  }

  useEffect(() => {
    if (!transitDeflections && !inCustodyDeflections && !releasedDeflections) return;
    const targetId = window.sessionStorage.getItem('custodyScrollTarget');
    if (!targetId) return;
    window.sessionStorage.removeItem('custodyScrollTarget');
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`custody-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ block: 'center' });
      }
    });
  }, [transitDeflections, inCustodyDeflections, releasedDeflections]);

  useEffect(() => {
    if (!transitDeflections && !inCustodyDeflections && !releasedDeflections) return;
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
  }, [transitDeflections, inCustodyDeflections, releasedDeflections]);

  useEffect(() => {
    if (activeTab !== 'released' || !highlightedId) return;
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
  }, [activeTab, highlightedId, releasedDeflections]);

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
  const transitGrouped = sortByArrivedFirst(groupTransitByOfficer(transitDeflections));
  const hasTransit = (transitDeflections?.length ?? 0) > 0;
  const hasInCustody = (inCustodyDeflections?.length ?? 0) > 0;
  const availableChairs = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.available ?? 0), 0);
  const heldCount = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.holds ?? 0), 0);
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
            heldCount={heldCount}
            occupiedCount={occupiedCount}
          />
          <SegmentedControl
            fullWidth
            value={activeTab}
            onChange={setTab}
            withItemsBorders={false}
            styles={{ label: { paddingInline: 4 } }}
            data={[
              {
                label: (
                  <Group gap={6} justify='center' wrap='nowrap'>
                    <span>Transit</span>
                    {transitDeflections && transitDeflections.length > 0 && (
                      <Badge size='sm' variant='filled' color='gray.6'>
                        {transitDeflections.length}
                      </Badge>
                    )}
                  </Group>
                ),
                value: 'transit',
              },
              { label: 'Custody', value: 'custody' },
              { label: 'Released', value: 'released' },
            ]}
          />
          <FacilityStatusBanner />
          {activeTab === 'transit' && (
            <Stack gap='md'>
              {hasTransit
                ? transitGrouped.map(group => (
                  <Stack
                    key={group.officerId}
                    gap='xs'
                    p='sm'
                    bg='gray.1'
                    className={classes.transitGroup}
                  >
                    <Text size='md' ta='center' truncate>{group.officerName}</Text>
                    {group.deflections.map(d => (
                      <TransitCustodyCard key={d.id} deflection={d} highlighted={String(d.id) === highlightedId} />
                    ))}
                  </Stack>
                ))
                : (
                  <EmptyState
                    title='No persons in Transit'
                    description='Detained persons on the way to this facility will appear here.'
                  />
                  )}
            </Stack>
          )}
          {activeTab === 'custody' && (
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
                    description="When you receive a person from an arresting officer, they'll appear here."
                  />
                  )}
            </Stack>
          )}
          {activeTab === 'released' && (
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
          {activeTab === 'transit' && transitDataUpdatedAt > 0 && (
            <Text size='xs' c='gray.5' ta='center'>Updated at {formatTime(DateTime.fromMillis(transitDataUpdatedAt).toISO())}</Text>
          )}
          {activeTab === 'custody' && dataUpdatedAt > 0 && (
            <Text size='xs' c='gray.5' ta='center'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
          )}
        </Stack>
      </Container>
      <ActionFooter>
        <Button
          data-testid='scan-code-btn'
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
