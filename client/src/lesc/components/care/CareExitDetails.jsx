import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, Container, Divider, Group, Input, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import Api from '@/Api';
import BooleanInput from '@/components/BooleanInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import ConfirmExitModal from './ConfirmExitModal';
import { getCareExitBackTo, getCareExitPrimaryActionState, getCareExitSuccessPayload } from './careFlowUtils';

const SF_RESIDENCY_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'DECLINED_CONSENT', label: 'Did not share' },
];

const CONNECTION_TO_CARE_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

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
  const [propertyReturnHandledConfirmed, setPropertyReturnHandledConfirmed] = useState(null);
  const [confirmExitOpened, setConfirmExitOpened] = useState(false);

  const fromDetail = searchParams.get('from') === 'detail';
  const backTo = getCareExitBackTo({ fromDetail, id });

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

  const {
    label: saveButtonLabel,
    disabled: saveButtonDisabled,
  } = getCareExitPrimaryActionState({
    isSectionTwoComplete,
    physicalLeftFinal,
    propertyReturnHandledConfirmed,
    isSaving: saveExitDetailsMutation.isPending || completeExitMutation.isPending,
  });

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
          <BooleanInput
            label='Person has physically left RESET?'
            description='Select “Yes” when the person has left the building or is in transit.'
            required
            disabled={!isSectionTwoComplete}
            value={physicalLeftFinal}
            onChange={setPhysicalLeftFinal}
          />

          <Divider />
          <BooleanInput
            label='I&apos;ve confirmed with an SFSO Deputy that property return has been handled.'
            required={physicalLeftFinal}
            disabled={!physicalLeftFinal}
            value={propertyReturnHandledConfirmed}
            onChange={setPropertyReturnHandledConfirmed}
          />

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
                if (physicalLeftFinal) {
                  setConfirmExitOpened(true);
                  return;
                }
                saveExitDetailsMutation.mutate();
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
