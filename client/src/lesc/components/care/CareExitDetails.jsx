import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, Container, Divider, Group, Input, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import ConfirmExitModal from './ConfirmExitModal';
import { getCareExitBackTo, getCareExitSuccessPayload } from './careFlowUtils';

const EXIT_DRAFT_STORAGE_KEY = 'careExitDraftByDeflectionId';

const SF_RESIDENCY_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const [initialized, setInitialized] = useState(false);

  const [exitDestinationId, setExitDestinationId] = useState(null);
  const [exitSFResident, setExitSFResident] = useState(null);
  const [exitHousingStatusId, setExitHousingStatusId] = useState(null);
  const [exitConnectedToCare, setExitConnectedToCare] = useState(null);
  const [physicalLeftFinal, setPhysicalLeftFinal] = useState(null);
  const [confirmExitOpened, setConfirmExitOpened] = useState(false);

  const savedTab = window.sessionStorage.getItem('careTab') || 'in-custody';
  const fromDetail = searchParams.get('from') === 'detail';
  const backTo = getCareExitBackTo({ fromDetail, id, savedTab });

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const { data: exitDestinations } = useQuery({
    queryKey: ['exitDestinations'],
    queryFn: () => Api.deflections.exitDestinations.index().then(response => response.data),
  });

  const { data: exitHousingStatuses } = useQuery({
    queryKey: ['exitHousingStatuses'],
    queryFn: () => Api.deflections.exitHousingStatuses.index().then(response => response.data),
  });

  useEffect(() => {
    if (!deflection || initialized) return;

    const savedDraft = readExitDraftMap()[String(deflection.id)];
    if (savedDraft) {
      setExitDestinationId(savedDraft.exitDestinationId ?? null);
      setExitSFResident(savedDraft.exitSFResident ?? null);
      setExitHousingStatusId(savedDraft.exitHousingStatusId ?? null);
      setExitConnectedToCare(savedDraft.exitConnectedToCare ?? null);
      setPhysicalLeftFinal(savedDraft.physicalLeftFinal ?? null);
      setInitialized(true);
      return;
    }

    setExitDestinationId(deflection.exitDestinationId ?? null);
    setExitSFResident(deflection.exitSFResident ?? null);
    setExitHousingStatusId(deflection.exitHousingStatusId ?? null);
    setExitConnectedToCare(deflection.exitConnectedToCare ?? null);
    setInitialized(true);
  }, [deflection, initialized]);

  const saveExitDetailsMutation = useMutation({
    mutationFn: () => Api.deflections.saveExitDetails(id, {
      exitDestinationId,
      exitSFResident,
      exitHousingStatusId,
      exitConnectedToCare,
    }),
    onSuccess: () => {
      writeExitDraft(id, {
        exitDestinationId,
        exitSFResident,
        exitHousingStatusId,
        exitConnectedToCare,
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
      exitDestinationId,
      exitSFResident,
      exitHousingStatusId,
      exitConnectedToCare,
    }),
    onSuccess: () => {
      const successPayload = getCareExitSuccessPayload(id);
      setConfirmExitOpened(false);
      removeExitDraft(id);
      window.sessionStorage.setItem('careHighlightTarget', successPayload.highlightTarget);
      queryClient.invalidateQueries({ queryKey: ['deflections', id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast(successPayload.toastTitle, 'success', 4000, successPayload.toastBody);
      navigate(successPayload.navigateTo);
    },
    onError: () => {
      setConfirmExitOpened(false);
      showToast('Exit not recorded. Please try again.', 'error');
    },
  });

  const isSectionTwoComplete = useMemo(
    () => (
      !!exitDestinationId &&
      !!exitSFResident &&
      !!exitHousingStatusId &&
      !!exitConnectedToCare
    ),
    [exitDestinationId, exitSFResident, exitHousingStatusId, exitConnectedToCare]
  );

  const saveButtonLabel = physicalLeftFinal === 'YES'
    ? 'Confirm exit'
    : (physicalLeftFinal === 'NO' ? 'Save exit details' : 'Save and continue');
  const saveButtonDisabled = !isSectionTwoComplete || !physicalLeftFinal || saveExitDetailsMutation.isPending || completeExitMutation.isPending;

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

          <Input.Wrapper label='Exit destination' required>
            <Chip.Group value={exitDestinationId} onChange={setExitDestinationId}>
              <Group gap='xs'>
                {exitDestinations?.map((option) => (
                  <Chip
                    key={option.id}
                    value={option.id}
                    size='md'
                  >
                    {option.name}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Input.Wrapper>

          <Input.Wrapper label='SF residency status' required>
            <Chip.Group value={exitSFResident} onChange={setExitSFResident}>
              <Group gap='xs'>
                {SF_RESIDENCY_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    size='md'
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Input.Wrapper>

          <Input.Wrapper label='Housing status' required>
            <Chip.Group value={exitHousingStatusId} onChange={setExitHousingStatusId}>
              <Group gap='xs'>
                {exitHousingStatuses?.map((option) => (
                  <Chip
                    key={option.id}
                    value={option.id}
                    size='md'
                  >
                    {option.name}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Input.Wrapper>

          <Input.Wrapper label='Connection to care' required>
            <Chip.Group value={exitConnectedToCare} onChange={setExitConnectedToCare}>
              <Group gap='xs'>
                {CONNECTION_TO_CARE_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    size='md'
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Input.Wrapper>

          <Divider />

          <Input.Wrapper label='Person has physically left RESET?' required>
            <Text size='md' c='dimmed'>Select “Yes” when the person has left the building or is in transit.</Text>
            <Chip.Group value={physicalLeftFinal} onChange={setPhysicalLeftFinal}>
              <Group gap='xs'>
                {PHYSICAL_EXIT_FINAL_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    value={option.value}
                    size='md'
                    disabled={!isSectionTwoComplete}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Input.Wrapper>

          <Group gap='sm'>
            <Button
              variant='destructive'
              onClick={() => navigate(backTo)}
            >
              Cancel
            </Button>
            <Button
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
