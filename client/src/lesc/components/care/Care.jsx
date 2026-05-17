import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Container, SegmentedControl, Stack, Text } from '@mantine/core';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { useNavigate } from 'react-router';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import ActionFooter from '@/components/ActionFooter';
import FacilityStatusBanner from '@/components/FacilityStatusBanner';
import ScanTransferCodeIcon from '@/components/ScanTransferCodeIcon';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import useSessionState from '@/hooks/useSessionState';
import useSatisfactionSurvey from '@/hooks/useSatisfactionSurvey';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';
import { formatTime } from '@/utils/format';

import ChairAvailabilityCard from '../ChairAvailabilityCard';
import EmptyState from '../EmptyState';
import StatusAccordion from '@/components/StatusAccordion';

import CareCard from './CareCard';
import CompleteIntakeModal from './CompleteIntakeModal';
import ScanAdmitCodeModal from './ScanAdmitCodeModal';
import { groupCareNotInCustodySections, hasPersistedExitDetails, hasSavedExitDraft } from './careFlowUtils';

const IN_CUSTODY_STATUSES = 'IN_MEDICAL_INTAKE,IN_CHAIR';
const NOT_IN_CUSTODY_STATUSES = 'RELEASED,EXITED';

const IN_CUSTODY_SECTIONS = [
  { status: 'IN_MEDICAL_INTAKE', label: 'In Medical Intake', tooltip: 'People currently in the medical admission process. Complete intake to move them to a chair.' },
  { status: 'IN_CHAIR', label: 'In-chair', tooltip: 'People currently occupying chairs.' },
];
const NOT_IN_CUSTODY_SECTIONS = [
  { status: 'STILL_ONSITE', label: 'Still onsite', tooltip: 'Legally released but still in chair.' },
  { status: 'EXITED_FACILITY', label: 'Exited facility', tooltip: 'People who have left the facility within the last 24 hours.' },
  { status: 'TRANSFERRED_TO_JAIL', label: 'Transferred to jail', tooltip: 'People who have left the facility for jail within the last 24 hours.' },
];

function groupByStatus (deflections) {
  const grouped = {};
  for (const d of deflections ?? []) {
    grouped[d.subjectStatus] ||= [];
    grouped[d.subjectStatus].push(d);
  }
  return grouped;
}

function hasSavedOrPersistedExitDetails (deflection) {
  return hasSavedExitDraft(deflection.id) || hasPersistedExitDetails(deflection);
}

function Care () {
  const { user } = useAuthContext();
  const [tab, setTab] = useSessionState('care', 'in-custody');
  const [scanModalOpened, setScanModalOpened] = useState(false);
  const [scanModalInstance, setScanModalInstance] = useState(0);
  const [intakeModalDeflection, setIntakeModalDeflection] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { scheduleOptionalSurveyWithoutNavigation, satisfactionSurveyModal } = useSatisfactionSurvey(navigate, '', {
    organizationId: 'connections',
  });

  const { data: inCustodyDeflections = [], dataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'care'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: IN_CUSTODY_STATUSES }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: notInCustodyDeflections = [] } = useQuery({
    queryKey: ['deflections', facility.id, 'care-not-in-custody'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: NOT_IN_CUSTODY_STATUSES, perPage: 200 }).then(r => r.data),
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

  useEffect(() => {
    if (!inCustodyDeflections.length && !notInCustodyDeflections.length) return;
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
  }, [inCustodyDeflections, notInCustodyDeflections]);

  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const hasInCustody = inCustodyDeflections.length > 0;
  const groupedInCustody = useMemo(() => groupByStatus(inCustodyDeflections), [inCustodyDeflections]);
  const groupedNotInCustody = useMemo(
    () => groupCareNotInCustodySections(notInCustodyDeflections),
    [notInCustodyDeflections]
  );
  const availableChairs = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.available ?? 0), 0);
  const inTransitCount = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.inTransit ?? 0), 0);
  const occupiedCount = (bedTypes ?? facility.bedTypes ?? []).reduce((sum, bedType) => sum + (bedType.occupied ?? 0), 0);

  function handleScanSuccess () {
    queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
  }

  const completeIntakeMutation = useMutation({
    mutationFn: ({ deflectionId, completed }) => Api.deflections.completeIntake(deflectionId, { completed }),
    onSuccess: (_, variables) => {
      if (variables.completed) {
        window.sessionStorage.setItem('careHighlightTarget', String(variables.deflectionId));
        showToast(
          'Intake completed',
          'success',
          4000,
          "Person moved to 'In-chair' for Sheriff's review."
        );
      } else {
        window.sessionStorage.setItem('custodyHighlightTarget', String(variables.deflectionId));
        showToast(
          'Intake not completed',
          'warning',
          4000,
          'Person moved back. Please review their status before release or exit.'
        );
      }
      scheduleOptionalSurveyWithoutNavigation(variables.deflectionId);
      setIntakeModalDeflection(null);
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'bed-types'] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
    },
    onError: () => {
      showToast('Intake update not saved. Please try again.', 'error');
    },
  });

  return (
    <>
      <Head>
        <title>Care</title>
      </Head>
      <Container pt='md' pb='xl'>
        <Stack gap='lg'>
          <ChairAvailabilityCard
            availableChairs={availableChairs}
            inTransitCount={inTransitCount}
            occupiedCount={occupiedCount}
            actionLabel={user.roles?.includes('FACILITY_ADMIN') ? 'Manage capacity' : undefined}
            onActionClick={() => navigate('/manage-capacity')}
          />
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'In custody', value: 'in-custody' },
              { label: 'Legally released', value: 'not-in-custody' },
            ]}
          />
          <FacilityStatusBanner />
          {tab === 'in-custody' && (
            hasInCustody
              ? (
                <StatusAccordion
                  sections={IN_CUSTODY_SECTIONS}
                  groupedItems={groupedInCustody}
                  renderCard={(d) =>
                    <CareCard
                      key={d.id}
                      deflection={d}
                      highlighted={String(d.id) === highlightedId}
                      onCompleteIntake={() => setIntakeModalDeflection(d)}
                      hasExitDraft={hasSavedOrPersistedExitDetails(d)}
                      onExitDetails={() => navigate(`/care/${d.id}/exit?from=detail`)}
                    />}
                />
                )
              : (
                <EmptyState
                  title='No persons waiting for intake'
                  description='When persons are ready for full intake, they’ll appear here.'
                />
                )
          )}
          {tab === 'not-in-custody' && (
            <StatusAccordion
              sections={NOT_IN_CUSTODY_SECTIONS}
              groupedItems={groupedNotInCustody}
              renderCard={(d) =>
                <CareCard
                  key={d.id}
                  deflection={d}
                  highlighted={String(d.id) === highlightedId}
                  onCompleteIntake={() => setIntakeModalDeflection(d)}
                  hasExitDraft={hasSavedOrPersistedExitDetails(d)}
                  onExitDetails={() => navigate(`/care/${d.id}/exit?from=detail`)}
                />}
            />
          )}
          {dataUpdatedAt > 0 && (
            <Text size='xs' c='gray.5' ta='center'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
          )}
        </Stack>
      </Container>
      <ActionFooter>
        <Button
          data-testid='scan-code-btn'
          variant='secondary'
          leftSection={<ScanTransferCodeIcon size={20} color='var(--mantine-color-indigo-6)' />}
          onClick={() => {
            setScanModalInstance((prev) => prev + 1);
            setScanModalOpened(true);
          }}
        >
          Begin a medical intake
        </Button>
      </ActionFooter>

      {scanModalOpened && (
        <ScanAdmitCodeModal
          key={scanModalInstance}
          opened={scanModalOpened}
          onClose={() => setScanModalOpened(false)}
          onSuccess={handleScanSuccess}
        />
      )}

      <CompleteIntakeModal
        opened={!!intakeModalDeflection}
        onClose={() => setIntakeModalDeflection(null)}
        loading={completeIntakeMutation.isPending}
        onConfirmCompleted={() => {
          if (!intakeModalDeflection) return;
          completeIntakeMutation.mutate({ deflectionId: intakeModalDeflection.id, completed: true });
        }}
        onConfirmNotCompleted={() => {
          if (!intakeModalDeflection) return;
          completeIntakeMutation.mutate({ deflectionId: intakeModalDeflection.id, completed: false });
        }}
      />

      <Box h='120px' />
      {satisfactionSurveyModal}
    </>
  );
}

export default Care;
