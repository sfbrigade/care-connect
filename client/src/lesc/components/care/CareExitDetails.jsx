import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import ConfirmExitModal from './ConfirmExitModal';

const EXIT_DRAFT_STORAGE_KEY = 'careExitDraftByDeflectionId';

const EXIT_DESTINATION_OPTIONS = [
  { value: 'JAIL', label: 'Jail' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'STREET', label: 'Street' },
  { value: 'HOME', label: 'Home' },
  { value: 'SERVICES_NON_HOSPITAL', label: 'Services - non-hospital' },
  { value: 'DECLINED_CONSENT', label: 'Declined consent' },
  { value: 'OTHER', label: 'Other' },
];

const SF_RESIDENCY_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'DECLINED_CONSENT', label: 'Declined consent' },
];

const HOUSING_STATUS_OPTIONS = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'SHELTERED', label: 'Sheltered' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'DECLINED_CONSENT', label: 'Declined consent' },
];

const CONNECTION_TO_CARE_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

const PHYSICAL_EXIT_FINAL_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
];

const destinationById = {
  jail: 'JAIL',
  hospital: 'HOSPITAL',
  street: 'STREET',
  home: 'HOME',
  services_non_hospital: 'SERVICES_NON_HOSPITAL',
  declined_consent: 'DECLINED_CONSENT',
  other: 'OTHER',
};

const housingById = {
  permanent: 'PERMANENT',
  sheltered: 'SHELTERED',
  temporary: 'TEMPORARY',
  unknown: 'UNKNOWN',
  declined_consent: 'DECLINED_CONSENT',
};

function readExitDraftMap () {
  try {
    return JSON.parse(window.localStorage.getItem(EXIT_DRAFT_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeExitDraft (id, data) {
  const next = readExitDraftMap();
  next[String(id)] = data;
  window.localStorage.setItem(EXIT_DRAFT_STORAGE_KEY, JSON.stringify(next));
}

function removeExitDraft (id) {
  const next = readExitDraftMap();
  delete next[String(id)];
  window.localStorage.setItem(EXIT_DRAFT_STORAGE_KEY, JSON.stringify(next));
}

function CareExitDetails () {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const [initialized, setInitialized] = useState(false);

  const [exitDestination, setExitDestination] = useState(null);
  const [sfResidencyStatus, setSfResidencyStatus] = useState(null);
  const [housingStatus, setHousingStatus] = useState(null);
  const [connectionToCare, setConnectionToCare] = useState(null);
  const [physicalLeftFinal, setPhysicalLeftFinal] = useState(null);
  const [confirmExitOpened, setConfirmExitOpened] = useState(false);

  const savedTab = window.sessionStorage.getItem('careTab') || 'in-custody';
  const backTo = savedTab === 'not-in-custody' ? '/care?tab=not-in-custody' : '/care';

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  useEffect(() => {
    if (!deflection || initialized) return;

    const savedDraft = readExitDraftMap()[String(deflection.id)];
    if (savedDraft) {
      setExitDestination(savedDraft.exitDestination ?? null);
      setSfResidencyStatus(savedDraft.sfResidencyStatus ?? null);
      setHousingStatus(savedDraft.housingStatus ?? null);
      setConnectionToCare(savedDraft.connectionToCare ?? null);
      setPhysicalLeftFinal(savedDraft.physicalLeftFinal ?? null);
      setInitialized(true);
      return;
    }

    setExitDestination(destinationById[deflection.exitDestinationId] ?? null);
    setSfResidencyStatus(deflection.exitSFResident ?? null);
    setHousingStatus(housingById[deflection.exitHousingStatusId] ?? null);
    setConnectionToCare(deflection.exitConnectedToCare ?? null);
    setInitialized(true);
  }, [deflection, initialized]);

  const saveExitDetailsMutation = useMutation({
    mutationFn: () => Api.deflections.saveExitDetails(id, {
      exitDestination,
      sfResidencyStatus,
      housingStatus,
      connectionToCare,
    }),
    onSuccess: () => {
      writeExitDraft(id, {
        exitDestination,
        sfResidencyStatus,
        housingStatus,
        connectionToCare,
        physicalLeftFinal,
        exitDetailsSaved: true,
      });
      queryClient.invalidateQueries({ queryKey: ['deflections', id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast('Exit details saved', 'success', 4000, 'Person is still in RESET - mark them as exited once they leave.');
      navigate(backTo);
    },
    onError: () => {
      showToast('Exit details not saved. Please try again.', 'error');
    },
  });

  const completeExitMutation = useMutation({
    mutationFn: () => Api.deflections.exit(id, {
      exitDestination,
      sfResidencyStatus,
      housingStatus,
      connectionToCare,
    }),
    onSuccess: () => {
      setConfirmExitOpened(false);
      removeExitDraft(id);
      window.sessionStorage.setItem('careHighlightTarget', String(id));
      queryClient.invalidateQueries({ queryKey: ['deflections', id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast('Exit recorded', 'success', 4000, 'Person now appears in Exited facility under Not in custody (last 24 hours).');
      navigate('/care?tab=not-in-custody');
    },
    onError: () => {
      setConfirmExitOpened(false);
      showToast('Exit not recorded. Please try again.', 'error');
    },
  });

  const isSectionTwoComplete = useMemo(
    () => (
      !!exitDestination &&
      !!sfResidencyStatus &&
      !!housingStatus &&
      !!connectionToCare
    ),
    [exitDestination, sfResidencyStatus, housingStatus, connectionToCare]
  );

  const saveButtonLabel = physicalLeftFinal === 'YES'
    ? 'Confirm exit'
    : (physicalLeftFinal === 'NO' ? 'Save exit details' : 'Save and continue');
  const saveButtonDisabled = !isSectionTwoComplete || !physicalLeftFinal || saveExitDetailsMutation.isPending || completeExitMutation.isPending;

  const chipStyles = {
    label: {
      lineHeight: '24px',
      fontSize: '16px',
      padding: '8px 16px',
      borderRadius: '32px',
    },
  };

  return (
    <>
      <Header>
        <IconButtonLink to={backTo} icon={IconArrowLeft} />
      </Header>
      <Container py='xl'>
        <Stack gap='xl'>
          <Stack gap={0}>
            <Text size='xl' c='gray.6'>Review and complete exit details</Text>
            <Title order={3}>These answers will be saved to the person&apos;s exit record.</Title>
          </Stack>

          <Stack gap='xs'>
            <Text size='lg' fw={600}>Exit destination<Text span c='red.6'>*</Text></Text>
            <Chip.Group value={exitDestination} onChange={setExitDestination}>
              <Group gap='xs'>
                {EXIT_DESTINATION_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    radius='xl'
                    size='md'
                    withCheckIcon={false}
                    color='indigo'
                    styles={chipStyles}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Stack>

          <Stack gap='xs'>
            <Text size='lg' fw={600}>SF residency status<Text span c='red.6'>*</Text></Text>
            <Chip.Group value={sfResidencyStatus} onChange={setSfResidencyStatus}>
              <Group gap='xs'>
                {SF_RESIDENCY_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    radius='xl'
                    size='md'
                    withCheckIcon={false}
                    color='indigo'
                    styles={chipStyles}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Stack>

          <Stack gap='xs'>
            <Text size='lg' fw={600}>Housing status<Text span c='red.6'>*</Text></Text>
            <Chip.Group value={housingStatus} onChange={setHousingStatus}>
              <Group gap='xs'>
                {HOUSING_STATUS_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    radius='xl'
                    size='md'
                    withCheckIcon={false}
                    color='indigo'
                    styles={chipStyles}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Stack>

          <Stack gap='xs'>
            <Text size='lg' fw={600}>Connection to care<Text span c='red.6'>*</Text></Text>
            <Chip.Group value={connectionToCare} onChange={setConnectionToCare}>
              <Group gap='xs'>
                {CONNECTION_TO_CARE_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    radius='xl'
                    size='md'
                    withCheckIcon={false}
                    color='indigo'
                    styles={chipStyles}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Stack>

          <Divider />

          <Stack gap='xs'>
            <Text size='lg' fw={600}>Person has physically left RESET?<Text span c='red.6'>*</Text></Text>
            <Text size='md' c='dimmed'>Select “Yes” when the person has left the building or is in transit.</Text>
            <Chip.Group value={physicalLeftFinal} onChange={setPhysicalLeftFinal}>
              <Group gap='xs'>
                {PHYSICAL_EXIT_FINAL_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    radius='xl'
                    size='md'
                    withCheckIcon={false}
                    disabled={!isSectionTwoComplete}
                    color='indigo'
                    styles={chipStyles}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Stack>

          <Group gap='sm'>
            <Button
              variant='light'
              color='red'
              radius='xl'
              size='md'
              onClick={() => navigate(backTo)}
            >
              Cancel
            </Button>
            <Button
              radius='xl'
              size='md'
              disabled={saveButtonDisabled}
              loading={saveExitDetailsMutation.isPending || completeExitMutation.isPending}
              onClick={() => {
                if (physicalLeftFinal === 'YES') {
                  setConfirmExitOpened(true);
                  return;
                }
                if (physicalLeftFinal === 'NO') {
                  saveExitDetailsMutation.mutate();
                }
              }}
            >
              {saveButtonLabel}
            </Button>
          </Group>
        </Stack>
      </Container>
      <ConfirmExitModal
        opened={confirmExitOpened}
        onClose={() => setConfirmExitOpened(false)}
        onConfirm={() => completeExitMutation.mutate()}
        loading={completeExitMutation.isPending}
      />
    </>
  );
}

export default CareExitDetails;
