import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionIcon, Box, Button, Container, Divider, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { IconChevronUp, IconScan } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import { formatTime } from '@/utils/format';
import CareCard from './CareCard';
import CompleteIntakeModal from './CompleteIntakeModal';
import ScanAdmitCodeModal from './ScanAdmitCodeModal';
import { groupCareNotInCustodySections, isCareSectionCaretDisabled } from './careFlowUtils';

const IN_CUSTODY_STATUSES = 'ADMITTED,IN_CHAIR';
const NOT_IN_CUSTODY_STATUSES = 'RELEASED,EXITED';

const IN_CUSTODY_SECTIONS = [
  { status: 'ADMITTED', label: 'In Medical Intake', description: 'Persons currently going through intake.' },
  { status: 'IN_CHAIR', label: 'In-chair' },
];
const NOT_IN_CUSTODY_SECTIONS = [
  { status: 'STILL_ONSITE', label: 'Still onsite' },
  { status: 'EXITED_FACILITY', label: 'Exited facility', description: 'In the last 24 hours.' },
  { status: 'TRANSFERRED_TO_JAIL', label: 'Transferred to jail', description: 'Exited without legal release. Visible for 24 hours.' },
];
const EXIT_DRAFT_STORAGE_KEY = 'careExitDraftByDeflectionId';

function groupByStatus (deflections) {
  const grouped = {};
  for (const d of deflections ?? []) {
    grouped[d.subjectStatus] ||= [];
    grouped[d.subjectStatus].push(d);
  }
  return grouped;
}

function hasSavedExitDraft (deflectionId) {
  if (typeof window === 'undefined') return false;
  try {
    const draftMap = JSON.parse(window.localStorage.getItem(EXIT_DRAFT_STORAGE_KEY) || '{}');
    return Boolean(draftMap?.[String(deflectionId)]?.exitDetailsSaved);
  } catch {
    return false;
  }
}

function Care () {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'not-in-custody' ? 'not-in-custody' : 'in-custody';
  const setTab = (value) => setSearchParams(value === 'in-custody' ? {} : { tab: value }, { replace: true });
  const [scanModalOpened, setScanModalOpened] = useState(false);
  const [scanModalInstance, setScanModalInstance] = useState(0);
  const [intakeModalDeflection, setIntakeModalDeflection] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({
    ADMITTED: false,
    IN_CHAIR: false,
    STILL_ONSITE: false,
    EXITED_FACILITY: false,
    TRANSFERRED_TO_JAIL: false,
  });
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: NOT_IN_CUSTODY_STATUSES }).then(r => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
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

  const groupedInCustody = useMemo(() => groupByStatus(inCustodyDeflections), [inCustodyDeflections]);
  const groupedNotInCustody = useMemo(
    () => groupCareNotInCustodySections(notInCustodyDeflections),
    [notInCustodyDeflections]
  );

  function toggleSection (sectionKey) {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

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
      setIntakeModalDeflection(null);
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
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'In custody', value: 'in-custody' },
              { label: 'Not in custody', value: 'not-in-custody' },
            ]}
          />
          <Divider />

          {tab === 'in-custody' && (
            <Stack gap='lg'>
              {IN_CUSTODY_SECTIONS.map(({ status, label, description }, index) => {
                const items = groupedInCustody[status] ?? [];
                const isEmpty = isCareSectionCaretDisabled(items);
                const isCollapsed = isEmpty ? false : collapsedSections[status];

                return (
                  <Stack key={status} gap='sm'>
                    {index > 0 && <Divider />}
                    <Group justify='space-between' align='flex-start' wrap='nowrap'>
                      <Box>
                        <Title order={3}>{label}: {items.length}</Title>
                        {description && <Text c='gray.5' size='md'>{description}</Text>}
                      </Box>
                      <ActionIcon
                        variant='subtle'
                        color='gray'
                        radius='xl'
                        size='xl'
                        disabled={isEmpty}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label} section`}
                        aria-expanded={!isCollapsed}
                        onClick={!isEmpty ? () => toggleSection(status) : undefined}
                        style={{ backgroundColor: 'rgb(from var(--mantine-color-gray-6) R G B / 0.1)' }}
                      >
                        <IconChevronUp
                          size={20}
                          style={{
                            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 150ms ease',
                          }}
                        />
                      </ActionIcon>
                    </Group>

                    {!isCollapsed && (
                      <Stack gap='sm'>
                        {items.map(d => (
                          <CareCard
                            key={d.id}
                            deflection={d}
                            highlighted={String(d.id) === highlightedId}
                            onCompleteIntake={() => setIntakeModalDeflection(d)}
                            hasExitDraft={hasSavedExitDraft(d.id)}
                            onExitDetails={() => {
                              window.sessionStorage.setItem('careTab', tab);
                              navigate(`/care/${d.id}/exit`);
                            }}
                            onViewDetails={() => {
                              window.sessionStorage.setItem('careTab', tab);
                              navigate(`/care/${d.id}`);
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          )}

          {tab === 'not-in-custody' && (
            <Stack gap='lg'>
              {NOT_IN_CUSTODY_SECTIONS.map(({ status, label, description }, index) => {
                const items = groupedNotInCustody[status] ?? [];
                const isEmpty = isCareSectionCaretDisabled(items);
                const isCollapsed = isEmpty ? false : collapsedSections[status];

                return (
                  <Stack key={status} gap='sm'>
                    {index > 0 && <Divider />}
                    <Group justify='space-between' align='flex-start' wrap='nowrap'>
                      <Box>
                        <Title order={3}>{label}: {items.length}</Title>
                        {description && <Text c='gray.5' size='md'>{description}</Text>}
                      </Box>
                      <ActionIcon
                        variant='subtle'
                        color='gray'
                        radius='xl'
                        size='xl'
                        disabled={isEmpty}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label} section`}
                        aria-expanded={!isCollapsed}
                        onClick={!isEmpty ? () => toggleSection(status) : undefined}
                        style={{ backgroundColor: 'rgb(from var(--mantine-color-gray-6) R G B / 0.1)' }}
                      >
                        <IconChevronUp
                          size={20}
                          style={{
                            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 150ms ease',
                          }}
                        />
                      </ActionIcon>
                    </Group>

                    {!isCollapsed && (
                      <Stack gap='sm'>
                        {items.map(d => (
                          <CareCard
                            key={d.id}
                            deflection={d}
                            highlighted={String(d.id) === highlightedId}
                            onCompleteIntake={() => setIntakeModalDeflection(d)}
                            hasExitDraft={hasSavedExitDraft(d.id)}
                            onExitDetails={() => {
                              window.sessionStorage.setItem('careTab', tab);
                              navigate(`/care/${d.id}/exit`);
                            }}
                            onViewDetails={() => {
                              window.sessionStorage.setItem('careTab', tab);
                              navigate(`/care/${d.id}`);
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          )}

          <Divider />

          {dataUpdatedAt > 0 && (
            <Text size='xs' c='gray.5' ta='center'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
          )}
        </Stack>
      </Container>

      <Box
        className='action-footer-gradient'
        pos='fixed'
        left={0}
        right={0}
        bottom={0}
        pt='md'
        pb='xl'
        style={{ zIndex: 10 }}
      >
        <Container>
          <Button
            variant='outline'
            fullWidth
            size='lg'
            radius='xl'
            leftSection={<IconScan size={20} />}
            onClick={() => {
              setScanModalInstance((prev) => prev + 1);
              setScanModalOpened(true);
            }}
          >
            Scan transfer code
          </Button>
        </Container>
      </Box>

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

      <Box h='104px' />
    </>
  );
}

export default Care;
