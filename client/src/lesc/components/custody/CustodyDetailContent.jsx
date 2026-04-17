import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Accordion, ActionIcon, Box, Button, Card, Container, Divider, Group, Image, Menu, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconArrowLeft, IconDots, IconDoorExit, IconExternalLink, IconFileAlert, IconFileCheck, IconBuildingHospital } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import ActionFooter from '@/components/ActionFooter';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import LockedQRCode from '@/components/LockedQRCode';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import useEnsureReleaseNarrative from '../../../hooks/useEnsureReleaseNarrative';
import { useUserRole } from '../../../hooks/useUserRole';
import { formatAddress, formatDateTime } from '@/utils/format';
import { releaseTiming } from '@/utils/releaseTiming';

import CompleteIntakeModal from '../care/CompleteIntakeModal';
import DeflectionStatusChip from '../DeflectionStatusChip';

import { getCareDetailFooterState } from './careDetailFooterUtils';
import { getCareStatusChip } from './careStatusChipUtils';
import { getCustodyStatusChip } from './custodyStatusChipUtils';
import { getPropertyReturnStatusText, shouldShowPropertyReturnEntryPoint } from './propertyReturnUtils';
import ExitToJailModal from './ExitToJailModal';
import RecordDeathModal from './RecordDeathModal';

const CUSTODY_ACTION_FOOTER_STATUSES = ['AWAITING_INTAKE', 'FAILED_INTAKE', 'READY_FOR_INTAKE', 'ADMITTED', 'IN_CHAIR', 'RELEASED', 'EXITED'];
const HOSPITAL_RELEASE_ELIGIBLE_STATUSES = ['AWAITING_INTAKE', 'FAILED_INTAKE', 'READY_FOR_INTAKE', 'ADMITTED', 'IN_CHAIR'];
const PROPERTY_RETURN_TOAST_KEY = 'custodyPropertyReturnToast';

function CustodyDetailContent ({ deflection, backTo = '/custody', viewerMode = 'custody' }) {
  const [completeIntakeModalOpened, setCompleteIntakeModalOpened] = useState(false);
  const [exitToJailModalOpened, setExitToJailModalOpened] = useState(false);
  const [recordDeathModalOpened, setRecordDeathModalOpened] = useState(false);
  const [custodyAccordionValues, setCustodyAccordionValues] = useState(['substance', 'deflection', 'property', 'incident', 'release-narrative']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const { isCustody } = useUserRole();
  const isCareView = viewerMode === 'care';
  const careFooterState = getCareDetailFooterState({ viewerMode, deflection });

  const isAwaitingSafetyCheck = deflection?.subjectStatus === 'AWAITING_INTAKE';
  const isReadyForIntake = deflection?.subjectStatus === 'READY_FOR_INTAKE';
  const isInMedicalIntake = deflection?.subjectStatus === 'ADMITTED';
  const isInChair = deflection?.subjectStatus === 'IN_CHAIR';
  const isFailedIntake = deflection?.subjectStatus === 'FAILED_INTAKE';
  const isLegallyReleased = deflection?.subjectStatus === 'RELEASED';
  const isExited = deflection?.subjectStatus === 'EXITED';
  const transferUrl = deflection ? `${window.location.origin}/admit/${deflection.id}` : '';
  const showCustodyActionFooter = !isCareView && CUSTODY_ACTION_FOOTER_STATUSES.includes(deflection?.subjectStatus);
  const showMoreActionsPrimaryOnly = isReadyForIntake || isInMedicalIntake;
  const showPrimaryStartLegalRelease = isInChair || isFailedIntake;
  const showPrimaryPrintCertificate = isLegallyReleased || isExited;
  const canExitToHospitalViaRelease = HOSPITAL_RELEASE_ELIGIBLE_STATUSES.includes(deflection?.subjectStatus);
  const showAwaitingPropertyReturnChip = shouldShowPropertyReturnEntryPoint({
    viewerMode,
    isCustody,
    deflection,
  });
  const showRecordPropertyReturnAction = showAwaitingPropertyReturnChip;
  const propertySectionId = `custody-property-section-${deflection?.id ?? 'unknown'}`;
  const custodyStatusChip = getCustodyStatusChip(deflection);
  const careStatusChip = getCareStatusChip({ deflection, careFooterState });
  const releaseTimingChip = releaseTiming(deflection);
  const propertyReturnStatusText = getPropertyReturnStatusText(deflection);

  function navigateToHospitalReleaseFlow () {
    navigate(`/custody/${deflection.id}/legal-release?from=detail&releaseReasonId=medical_issue&exitDestinationId=hospital`);
  }

  useEffect(() => {
    if (isCareView || !deflection?.id) return;

    const raw = window.sessionStorage.getItem(PROPERTY_RETURN_TOAST_KEY);
    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      window.sessionStorage.removeItem(PROPERTY_RETURN_TOAST_KEY);
      return;
    }

    if (parsed?.deflectionId !== String(deflection.id)) return;

    window.sessionStorage.removeItem(PROPERTY_RETURN_TOAST_KEY);
    showToast('Property return update recorded', 'success', 4000, 'Saved to this person\'s exit record');
    setCustodyAccordionValues(prev => (prev.includes('property') ? prev : [...prev, 'property']));
    window.setTimeout(() => {
      document.getElementById(propertySectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [deflection?.id, isCareView, propertySectionId, showToast]);

  const safetyCheckMutation = useMutation({
    mutationFn: () => Api.deflections.safetyCheck(deflection.id),
    onSuccess: () => {
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', String(deflection.id)] });
      showToast('Safety check completed', 'success', 4000, 'Person is ready for medical intake.');
    },
    onError: () => {
      showToast('Safety check not saved. Please try again.', 'error');
    },
  });

  const recordDeathMutation = useMutation({
    mutationFn: () => Api.deflections.recordDeath(deflection.id),
    onSuccess: () => {
      setRecordDeathModalOpened(false);
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', String(deflection.id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      showToast('Death recorded', 'success', 4000, 'Death recorded. All associated holds or chairs have been released.');
      navigate('/custody');
    },
    onError: () => {
      showToast('Couldn\'t record death', 'error', 4000, 'Please check your connection and try again.');
    },
  });

  const exitToJailMutation = useMutation({
    mutationFn: () => Api.deflections.exitToJail(deflection.id),
    onSuccess: () => {
      setExitToJailModalOpened(false);
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      window.sessionStorage.setItem('custodyReleasedSectionTarget', 'TRANSFERRED_TO_JAIL');
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', String(deflection.id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      showToast('Exit recorded', 'success', 4000, 'Person moved to "Transferred to jail" under Not in custody.');
      navigate('/custody?tab=released');
    },
    onError: () => {
      showToast('Couldn\'t record exit', 'error', 4000, 'Please check your connection and try again.');
    },
  });

  const completeIntakeMutation = useMutation({
    mutationFn: ({ completed }) => Api.deflections.completeIntake(deflection.id, { completed }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deflections', String(deflection.id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      setCompleteIntakeModalOpened(false);

      if (variables.completed) {
        showToast(
          'Intake completed',
          'success',
          4000,
          "Person moved to 'In-chair' for Sheriff's review."
        );
      } else {
        showToast(
          'Intake not completed',
          'warning',
          4000,
          'Person moved back. Please review their status before release or exit.'
        );
      }
    },
    onError: () => {
      showToast('Intake update not saved. Please try again.', 'error');
    },
  });

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const careDisplayName = [deflection?.subject?.firstName, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const address = formatAddress(deflection?.subject ?? {});
  const [releaseNarrative, setReleaseNarrative] = useState('');
  const [isEditingReleaseNarrative, setIsEditingReleaseNarrative] = useState(false);

  const incidentQuery = useQuery({
    queryKey: ['incidents', deflection?.incidentId],
    queryFn: () => Api.incidents.get(deflection.incidentId).then(response => response.data),
    enabled: !!deflection?.incidentId,
  });
  const incident = incidentQuery.data;
  const incidentAddress = formatAddress(incident ?? {});
  const resolvedReleaseNarrative = useEnsureReleaseNarrative({
    deflection,
    incident,
    incidentReady: !deflection?.incidentId || incidentQuery.isFetched,
  });

  useEffect(() => {
    if (!isEditingReleaseNarrative) {
      setReleaseNarrative(resolvedReleaseNarrative);
    }
  }, [resolvedReleaseNarrative, isEditingReleaseNarrative]);

  const saveReleaseNarrativeMutation = useMutation({
    mutationFn: () => Api.deflections.update(deflection.id, { releaseNarrative: releaseNarrative.trim() || null }),
    onSuccess: (response) => {
      queryClient.setQueryData(['deflections', String(deflection.id)], response.data);
      queryClient.setQueryData(['deflections', deflection.id], response.data);
      setIsEditingReleaseNarrative(false);
      showToast('849(b) narrative saved', 'success');
    },
    onError: () => {
      showToast('Narrative not saved. Please try again.', 'error');
    },
  });

  const doc849b = deflection?.deflectionDocuments?.find(d => d.formId === '849b');
  const docCert = deflection?.deflectionDocuments?.find(d => d.formId === 'cert');

  function open849bPdf () {
    const url = doc849b?.fileUrl || `/api/forms/849b/pdf/${deflection.id}`;
    window.open(url, '_blank');
  }

  return (
    <>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={backTo} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Stack gap='sm' align='center'>
            <Group gap='xs'>
              {deflection?.incidentId && <Text size='md'>Incident {deflection.incidentId}</Text>}
              {deflection?.incidentId && <Text c='gray.5' size='md'>&middot;</Text>}
              <Text size='md' c='gray.6'>Hold {deflection ? deflection.id : ''}</Text>
            </Group>
            {!isCareView && (
              <Stack gap='xs' align='center'>
                <DeflectionStatusChip label={custodyStatusChip?.label} tone={custodyStatusChip?.tone} />
                {releaseTimingChip && (
                  <DeflectionStatusChip label={releaseTimingChip.label} tone={releaseTimingChip.tone} />
                )}
                {showAwaitingPropertyReturnChip && (
                  <DeflectionStatusChip label='Awaiting property return' tone='info' />
                )}
              </Stack>
            )}
            {isCareView && (
              <Stack gap='xs' align='center'>
                <DeflectionStatusChip label={careStatusChip?.label} tone={careStatusChip?.tone} />
                {releaseTimingChip && (
                  <DeflectionStatusChip label={releaseTimingChip.label} tone={releaseTimingChip.tone} />
                )}
              </Stack>
            )}
          </Stack>
          {!isCareView && (isAwaitingSafetyCheck || isReadyForIntake) && (
            <Stack gap='sm' align='center'>
              <Card bg='white' p={32} withBorder style={{ alignSelf: 'center' }}>
                <Stack gap='md' align='center'>
                  <LockedQRCode value={transferUrl} variant={!isReadyForIntake ? 'locked' : undefined} />
                  <Text fw={500}>Transfer code: {isReadyForIntake ? deflection.id : '******'}</Text>
                  {isAwaitingSafetyCheck && (
                    <Text size='sm' c='dimmed' ta='center'>QR locked — finish Safety check to enable.</Text>
                  )}
                </Stack>
              </Card>
              {isReadyForIntake && (
                <Text size='xs' c='gray.5' ta='center'>Intake staff can scan this code to start full intake.</Text>
              )}
            </Stack>
          )}
          {!isCareView && (isLegallyReleased || isExited) && (
            <Stack gap='xs' align='flex-start'>
              <Button
                onClick={open849bPdf}
                variant='outline'
                rightSection={<IconExternalLink size={18} style={{ flexShrink: 0, marginLeft: 4 }} />}
              >
                849(b).pdf
              </Button>
            </Stack>
          )}
          <Stack gap='sm'>
            <Title order={2}>{isCareView ? careDisplayName : name}</Title>
            {isCareView && (
              <>
                <Box>
                  <Text c='dimmed'>First name</Text>
                  <Text>{deflection?.subject?.firstName || 'Unknown'}</Text>
                </Box>
                <Box>
                  <Text c='dimmed'>Last name</Text>
                  <Text>{deflection?.subject?.lastName || 'Unknown'}</Text>
                </Box>
              </>
            )}
            {deflection?.subject?.dateOfBirth && (
              <Box>
                <Text c='dimmed'>Date of birth</Text>
                <Text>{DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toLocaleString(DateTime.DATE_SHORT)}</Text>
              </Box>
            )}
            {deflection?.subject?.sex && (
              <Box>
                <Text c='dimmed'>{isCareView ? 'Gender' : 'Sex'}</Text>
                <Text>{t(`sex.${deflection.subject.sex}`)}</Text>
              </Box>
            )}
            {deflection?.subject?.race && (
              <Box>
                <Text c='dimmed'>Race</Text>
                <Text>{t(`race.${deflection.subject.race}`)}</Text>
              </Box>
            )}
            {!isCareView && deflection?.subject?.driverLicense && (
              <Box>
                <Text c='dimmed'>Driver's license number</Text>
                <Text>{deflection.subject.driverLicense}</Text>
              </Box>
            )}
            {!isCareView && address && (
              <Box>
                <Text c='dimmed'>Address</Text>
                <Text>{address}</Text>
              </Box>
            )}
            {!isCareView && (
              <Group mt='md'>
                <Button variant='secondary' size='md' onClick={() => navigate(`/custody/${deflection?.id}/subject`)}>Edit</Button>
              </Group>
            )}
          </Stack>
          {!isCareView && (
            <>
              <Accordion
                variant='section'
                multiple
                value={custodyAccordionValues}
                onChange={setCustodyAccordionValues}
              >
                <Divider />
                <Accordion.Item value='substance'>
                  <Accordion.Control>
                    <Title order={3}>Substance details</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {deflection?.narcoticsSubstance !== null && deflection?.narcoticsSubstance !== undefined && (
                        <Box>
                          <Text c='dimmed'>Controlled substance found</Text>
                          <Text c={deflection.narcoticsSubstance ? 'red.6' : 'teal.6'}>{deflection.narcoticsSubstance ? 'Yes' : 'No'}</Text>
                        </Box>
                      )}
                      {deflection?.narcoticsParaphernalia !== null && deflection?.narcoticsParaphernalia !== undefined && (
                        <Box>
                          <Text c='dimmed'>Paraphernalia found</Text>
                          <Text c={deflection.narcoticsParaphernalia ? 'red.6' : 'teal.6'}>{deflection.narcoticsParaphernalia ? 'Yes' : 'No'}</Text>
                        </Box>
                      )}
                      {deflection?.drugUseEvidence !== null && deflection?.drugUseEvidence !== undefined && (
                        <Box>
                          <Text c='dimmed'>Signs of substance use</Text>
                          <Text c={deflection.drugUseEvidence ? 'red.6' : 'teal.6'}>{deflection.drugUseEvidence ? 'Yes' : 'No'}</Text>
                        </Box>
                      )}
                      {deflection?.drugUseEvidence === true && deflection?.drugType && (
                        <Box>
                          <Text c='dimmed'>Substance used</Text>
                          <Text>{t(`drugType.${deflection.drugType}`)}</Text>
                        </Box>
                      )}
                      <Group mt='sm'>
                        <Button variant='secondary' size='md' onClick={() => navigate(`/custody/${deflection?.id}/subject?section=narcotics`)}>Edit</Button>
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value='deflection'>
                  <Accordion.Control>
                    <Title order={3}>Behavioral observations</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {!!deflection?.behavior && (
                        <Box>
                          <Text c='dimmed'>647(f) narrative</Text>
                          <Text>{deflection?.behavior}</Text>
                        </Box>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value='property' id={propertySectionId}>
                  <Accordion.Control>
                    <Title order={3}>Property details</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {!!deflection?.propertyPhotos?.length && (
                        <Group gap='sm'>
                          {deflection?.propertyPhotos?.map(photo => (
                            <Image
                              key={photo.id}
                              src={photo.fileUrl}
                              w={160}
                              h='auto'
                              fit='contain'
                            />
                          ))}
                        </Group>
                      )}
                      {!!deflection?.property && (
                        <Box>
                          <Text c='dimmed'>Volume of property</Text>
                          <Text>{t(`property.${deflection?.property}`)}</Text>
                        </Box>
                      )}
                      {!!deflection?.propertyDetails && (
                        <Box>
                          <Text c='dimmed'>Description</Text>
                          <Text>{deflection?.propertyDetails}</Text>
                        </Box>
                      )}
                      {!!propertyReturnStatusText && (
                        <Text c={deflection?.propertyReturned ? 'teal.6' : 'yellow.8'}>{propertyReturnStatusText}</Text>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value='incident'>
                  <Accordion.Control>
                    <Title order={3}>Incident details</Title>
                    <Text c='gray.5' size='sm'>These details apply to all holds in this incident</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {incidentAddress && (
                        <Box>
                          <Text c='dimmed'>Address</Text>
                          <Text>{incidentAddress}</Text>
                        </Box>
                      )}
                      {incident?.arrestedAt && (
                        <Box>
                          <Text c='dimmed'>Date and time</Text>
                          <Text>{formatDateTime(incident.arrestedAt)}</Text>
                        </Box>
                      )}
                      {incident?.cadNumber && (
                        <Box>
                          <Text c='dimmed'>CAD #</Text>
                          <Text>{incident.cadNumber}</Text>
                        </Box>
                      )}
                      {incident?.caseNumber && (
                        <Box>
                          <Text c='dimmed'>Case #</Text>
                          <Text>{incident.caseNumber}</Text>
                        </Box>
                      )}
                      {incident?.supervisorBadgeNumber && (
                        <Box>
                          <Text c='dimmed'>SFSO supervisor star #</Text>
                          <Text>{incident.supervisorBadgeNumber}</Text>
                        </Box>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value='release-narrative'>
                  <Accordion.Control>
                    <Title order={3}>849(b) release narrative</Title>
                    <Text c='gray.5' size='sm'>This text will appear in the narrative block on the 849(b) form</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      <Box>
                        <Text c='dimmed'>Narrative</Text>
                        {isEditingReleaseNarrative
                          ? (
                            <Textarea
                              value={releaseNarrative}
                              onChange={(event) => setReleaseNarrative(event.currentTarget.value)}
                              autosize
                              minRows={4}
                              mt='xs'
                            />
                            )
                          : <Text style={{ whiteSpace: 'pre-wrap' }}>{resolvedReleaseNarrative}</Text>}
                      </Box>
                      {!isEditingReleaseNarrative && (
                        <Group>
                          <Button
                            variant='secondary'
                            size='md'
                            onClick={() => setIsEditingReleaseNarrative(true)}
                          >
                            Edit
                          </Button>
                        </Group>
                      )}
                      {isEditingReleaseNarrative && (
                        <Group>
                          <Button
                            variant='secondary'
                            size='md'
                            onClick={() => {
                              setReleaseNarrative(resolvedReleaseNarrative);
                              setIsEditingReleaseNarrative(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size='md'
                            onClick={() => saveReleaseNarrativeMutation.mutate()}
                            loading={saveReleaseNarrativeMutation.isPending}
                          >
                            Save narrative
                          </Button>
                        </Group>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </>
          )}
        </Stack>
      </Container>
      {careFooterState.showFooter && (
        <ActionFooter>
          <Button
            variant='secondary'
            onClick={() => {
              if (careFooterState.primaryAction === 'complete-intake') {
                setCompleteIntakeModalOpened(true);
                return;
              }
              if (careFooterState.primaryAction === 'start-exit') {
                navigate(careFooterState.startExitPath);
              }
            }}
          >
            {careFooterState.primaryLabel}
          </Button>
        </ActionFooter>
      )}
      {showCustodyActionFooter && (
        <ActionFooter>
          {showMoreActionsPrimaryOnly
            ? (
              <Menu
                position='top-start'
                shadow='sm'
                radius='lg'
                width={260}
                withinPortal
              >
                <Menu.Target>
                  <Button
                    variant='secondary'
                    leftSection={<IconDots size={22} color='var(--mantine-color-indigo-6)' />}
                  >
                    More actions
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconFileCheck size={18} color='var(--mantine-color-gray-5)' />}
                    onClick={() => navigate(`/custody/${deflection.id}/legal-release?from=detail`)}
                  >
                    Legal release
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDoorExit size={18} color='var(--mantine-color-gray-5)' />}
                    onClick={() => setExitToJailModalOpened(true)}
                  >
                    Exit to jail
                  </Menu.Item>
                  {canExitToHospitalViaRelease && (
                    <Menu.Item
                      leftSection={<IconBuildingHospital size={18} color='var(--mantine-color-gray-5)' />}
                      onClick={navigateToHospitalReleaseFlow}
                    >
                      Exit to hospital
                    </Menu.Item>
                  )}
                  <Menu.Item
                    leftSection={<IconFileAlert size={18} color='var(--mantine-color-gray-5)' />}
                    onClick={() => setRecordDeathModalOpened(true)}
                  >
                    Record death
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              )
            : (
              <Stack gap='sm' w='100%' align='stretch'>
                {showRecordPropertyReturnAction && (
                  <Button
                    variant='secondary'
                    onClick={() => navigate(`/custody/${deflection.id}/property-return`)}
                  >
                    Record property return
                  </Button>
                )}
                <Group gap='sm' wrap='nowrap'>
                  {!isExited && (
                    <Menu
                      position='top-start'
                      shadow='sm'
                      radius='lg'
                      width={260}
                      withinPortal
                    >
                      <Menu.Target>
                        <ActionIcon
                          variant='filled'
                          color='indigo.0'
                          radius='50%'
                          size={48}
                          aria-label='More actions'
                          style={{ minWidth: 48, flex: '0 0 48px' }}
                        >
                          <IconDots size={24} color='var(--mantine-color-indigo-6)' />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {isAwaitingSafetyCheck && (
                          <Menu.Item
                            leftSection={<IconFileCheck size={18} color='var(--mantine-color-gray-5)' />}
                            onClick={() => navigate(`/custody/${deflection.id}/legal-release?from=detail`)}
                          >
                            Legal release
                          </Menu.Item>
                        )}
                        <Menu.Item
                          leftSection={<IconDoorExit size={18} color='var(--mantine-color-gray-5)' />}
                          onClick={() => setExitToJailModalOpened(true)}
                        >
                          Record exit to jail
                        </Menu.Item>
                        {canExitToHospitalViaRelease && (
                          <Menu.Item
                            leftSection={<IconBuildingHospital size={18} color='var(--mantine-color-gray-5)' />}
                            onClick={navigateToHospitalReleaseFlow}
                          >
                            Record exit to hospital
                          </Menu.Item>
                        )}
                        <Menu.Item
                          leftSection={<IconFileAlert size={18} color='var(--mantine-color-gray-5)' />}
                          onClick={() => setRecordDeathModalOpened(true)}
                        >
                          Record death
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                  <Button
                    onClick={() => {
                      if (isAwaitingSafetyCheck) {
                        safetyCheckMutation.mutate();
                        return;
                      }
                      if (showPrimaryStartLegalRelease) {
                        navigate(`/custody/${deflection.id}/legal-release?from=detail`);
                        return;
                      }
                      if (showPrimaryPrintCertificate) {
                        const url = docCert?.fileUrl || `/api/forms/cert/pdf/${deflection.id}`;
                        window.open(url, '_blank');
                      }
                    }}
                    loading={isAwaitingSafetyCheck ? safetyCheckMutation.isPending : false}
                  >
                    {isAwaitingSafetyCheck
                      ? 'Complete safety check'
                      : (showPrimaryPrintCertificate ? 'Print release certificate' : 'Start legal release')}
                  </Button>
                </Group>
              </Stack>
              )}
        </ActionFooter>
      )}
      {(careFooterState.showFooter || showCustodyActionFooter) && (
        <Box h={showCustodyActionFooter && showRecordPropertyReturnAction ? '184px' : '128px'} />
      )}
      <RecordDeathModal
        opened={recordDeathModalOpened}
        onClose={() => setRecordDeathModalOpened(false)}
        onConfirm={() => recordDeathMutation.mutate()}
        loading={recordDeathMutation.isPending}
      />
      <ExitToJailModal
        opened={exitToJailModalOpened}
        onClose={() => setExitToJailModalOpened(false)}
        onConfirm={() => exitToJailMutation.mutate()}
        loading={exitToJailMutation.isPending}
      />
      <CompleteIntakeModal
        opened={completeIntakeModalOpened}
        onClose={() => setCompleteIntakeModalOpened(false)}
        loading={completeIntakeMutation.isPending}
        onConfirmCompleted={() => completeIntakeMutation.mutate({ completed: true })}
        onConfirmNotCompleted={() => completeIntakeMutation.mutate({ completed: false })}
      />
    </>
  );
}

export default CustodyDetailContent;
