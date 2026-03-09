import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Accordion, ActionIcon, Box, Button, Card, Container, Divider, Group, Image, Menu, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconArrowLeft, IconDots, IconDoorExit, IconExternalLink, IconFileAlert, IconFileCheck } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import LockedQRCode from '@/components/LockedQRCode';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatAddress, formatDateTime } from '@/utils/format';
import { generateCertificateOfReleasePDF } from '@/utils/pdfGenerator';
import { getCareDetailFooterState } from './careDetailFooterUtils';
import ExitToJailModal from './ExitToJailModal';
import RecordDeathModal from './RecordDeathModal';

const CUSTODY_ACTION_FOOTER_STATUSES = ['AWAITING_INTAKE', 'FAILED_INTAKE', 'READY_FOR_INTAKE', 'ADMITTED', 'IN_CHAIR', 'RELEASED'];

function CustodyDetailContent ({ deflection, backTo = '/custody', viewerMode = 'custody' }) {
  const [exitToJailModalOpened, setExitToJailModalOpened] = useState(false);
  const [recordDeathModalOpened, setRecordDeathModalOpened] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const isCareView = viewerMode === 'care';
  const careFooterState = getCareDetailFooterState({ viewerMode, deflection });

  const isAwaitingSafetyCheck = deflection?.subjectStatus === 'AWAITING_INTAKE';
  const isReadyForIntake = deflection?.subjectStatus === 'READY_FOR_INTAKE';
  const isLegallyReleased = deflection?.subjectStatus === 'RELEASED';
  const transferUrl = deflection ? `${window.location.origin}/admit/${deflection.id}` : '';
  const showCustodyActionFooter = !isCareView && CUSTODY_ACTION_FOOTER_STATUSES.includes(deflection?.subjectStatus);
  const showStartLegalReleasePrimary = !isAwaitingSafetyCheck && !isReadyForIntake;
  const showOverflowStartLegalRelease = isAwaitingSafetyCheck;
  const showSingleOverflowButton = isReadyForIntake || isLegallyReleased;

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

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const careDisplayName = [deflection?.subject?.firstName, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const address = formatAddress(deflection?.subject ?? {});
  const [releaseNarrative, setReleaseNarrative] = useState('');
  const [isEditingReleaseNarrative, setIsEditingReleaseNarrative] = useState(false);

  const { data: incident } = useQuery({
    queryKey: ['incidents', deflection?.incidentId],
    queryFn: () => Api.incidents.get(deflection.incidentId).then(response => response.data),
    enabled: !!deflection?.incidentId,
  });
  const incidentAddress = formatAddress(incident ?? {});

  useEffect(() => {
    setReleaseNarrative(deflection?.releaseNarrative ?? '');
    setIsEditingReleaseNarrative(false);
  }, [deflection?.releaseNarrative]);

  const saveReleaseNarrativeMutation = useMutation({
    mutationFn: () => Api.deflections.update(deflection.id, { releaseNarrative: releaseNarrative.trim() || null }),
    onSuccess: (response) => {
      queryClient.setQueryData(['deflections', String(deflection.id)], response.data);
      setIsEditingReleaseNarrative(false);
      showToast('849(b) narrative saved', 'success');
    },
    onError: () => {
      showToast('Narrative not saved. Please try again.', 'error');
    },
  });

  function open849bPdf () {
    const holdData = {
      id: String(deflection.id),
      client: deflection.subject,
      incident: {
        dateTimeArrested: incident?.arrestedAt ?? null,
      },
      createdAt: deflection?.createdAt,
      transferredAt: deflection?.releasedAt ?? null,
      createdBy: deflection?.createdBy ?? null,
    };
    const doc = generateCertificateOfReleasePDF(holdData);
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  function onReleaseNarrativeButtonClick () {
    if (!isEditingReleaseNarrative) {
      setIsEditingReleaseNarrative(true);
      return;
    }
    saveReleaseNarrativeMutation.mutate();
  }

  return (
    <>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={backTo} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Group gap='xs'>
            {deflection?.incidentId && <Text size='md'>Incident {String(deflection.incidentId).padStart(6, '0')}</Text>}
            {deflection?.incidentId && <Text c='gray.5' size='md'>&middot;</Text>}
            <Text size='md' c='gray.6'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
          </Group>
          {!isCareView && (isAwaitingSafetyCheck || isReadyForIntake) && (
            <Stack gap='sm' align='center'>
              {isReadyForIntake && (
                <Text c='teal.6' size='md' w='100%'>Safety check completed</Text>
              )}
              <Card bg='white' p={32} withBorder style={{ alignSelf: 'center' }}>
                <Stack gap='md' align='center'>
                  <LockedQRCode value={transferUrl} locked={!isReadyForIntake} />
                  <Text fw={500}>Transfer code: {isReadyForIntake ? String(deflection.id).padStart(6, '0') : '******'}</Text>
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
          {!isCareView && (
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
                <Button onClick={() => navigate(`/custody/${deflection?.id}/subject`)} variant='secondary'>Edit details</Button>
              </Group>
            )}
          </Stack>
          {!isCareView && (
            <>
              <Accordion variant='section' defaultValue={['narcotics', 'release-narrative']}>
                <Divider />
                <Accordion.Item value='narcotics'>
                  <Accordion.Control>
                    <Title order={3}>Narcotics</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {deflection?.narcoticsSubstance !== null && deflection?.narcoticsSubstance !== undefined && (
                        <Box>
                          <Text c='dimmed'>Controlled substance</Text>
                          <Text c={deflection.narcoticsSubstance ? 'red.6' : 'teal.6'}>{deflection.narcoticsSubstance ? 'Yes' : 'No'}</Text>
                        </Box>
                      )}
                      {deflection?.narcoticsParaphernalia !== null && deflection?.narcoticsParaphernalia !== undefined && (
                        <Box>
                          <Text c='dimmed'>Paraphernalia</Text>
                          <Text c={deflection.narcoticsParaphernalia ? 'red.6' : 'teal.6'}>{deflection.narcoticsParaphernalia ? 'Yes' : 'No'}</Text>
                        </Box>
                      )}
                      <Group mt='sm'>
                        <Button onClick={() => navigate(`/custody/${deflection?.id}/subject?section=narcotics`)} variant='secondary' size='sm'>Edit</Button>
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value='deflection'>
                  <Accordion.Control>
                    <Title order={3}>Arrest details</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='sm'>
                      {!!deflection?.deflectionDetails?.length && (
                        <Box>
                          <Text c='dimmed'>Selected observations</Text>
                          <Text>{deflection?.deflectionDetails?.map(detail => detail.name).join('; ')}</Text>
                        </Box>
                      )}
                      {!!deflection?.behavior && (
                        <Box>
                          <Text c='dimmed'>Narrative (arrestable behavior)</Text>
                          <Text>{deflection?.behavior}</Text>
                        </Box>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value='property'>
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
                          : <Text style={{ whiteSpace: 'pre-wrap' }}>{releaseNarrative}</Text>}
                      </Box>
                      <Group>
                        <Button
                          onClick={onReleaseNarrativeButtonClick}
                          loading={saveReleaseNarrativeMutation.isPending}
                          variant='secondary'
                        >
                          Edit
                        </Button>
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </>
          )}
        </Stack>
      </Container>
      {careFooterState.showFooter && (
        <Box
          pos='fixed'
          left={0}
          right={0}
          bottom={0}
          bg='gray.0'
          pt='md'
          pb='xl'
          style={{ zIndex: 10 }}
        >
          <Container>
            <Group justify='center' gap='sm' wrap='nowrap'>
              <ActionIcon
                variant='outline'
                color='indigo'
                radius='50%'
                size={48}
                disabled={careFooterState.overflowDisabled}
                aria-label='More actions'
                style={{ minWidth: 48, flex: '0 0 48px' }}
              >
                <IconDots size={24} />
              </ActionIcon>
              <Button
                color='indigo'
                radius='xl'
                size='lg'
                onClick={() => navigate(careFooterState.startExitPath)}
              >
                Start exit
              </Button>
            </Group>
          </Container>
        </Box>
      )}
      {showCustodyActionFooter && (
        <Box
          pos='fixed'
          left={0}
          right={0}
          bottom={0}
          bg='gray.0'
          pt='md'
          pb='xl'
          style={{ zIndex: 10 }}
        >
          <Container>
            <Group justify='center' gap='sm' wrap='nowrap'>
              {showSingleOverflowButton
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
                        color='indigo'
                        radius='xl'
                        size='lg'
                      >
                        More actions
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {!isLegallyReleased && (
                        <>
                          <Menu.Item
                            leftSection={<IconFileCheck size={18} color='var(--mantine-color-gray-5)' />}
                            onClick={() => navigate(`/custody/${deflection.id}/legal-release?from=detail`)}
                          >
                            Start legal release
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconDoorExit size={18} color='var(--mantine-color-gray-5)' />}
                            onClick={() => setExitToJailModalOpened(true)}
                          >
                            Record exit to jail
                          </Menu.Item>
                        </>
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
                  <>
                    <Menu
                      position='top-start'
                      shadow='sm'
                      radius='lg'
                      width={260}
                      withinPortal
                    >
                      <Menu.Target>
                        <ActionIcon
                          variant='outline'
                          color='indigo'
                          radius='50%'
                          size={48}
                          aria-label='More actions'
                          style={{ minWidth: 48, flex: '0 0 48px' }}
                        >
                          <IconDots size={24} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {showOverflowStartLegalRelease && (
                          <Menu.Item
                            leftSection={<IconFileCheck size={18} color='var(--mantine-color-gray-5)' />}
                            onClick={() => navigate(`/custody/${deflection.id}/legal-release?from=detail`)}
                          >
                            Start legal release
                          </Menu.Item>
                        )}
                        {isReadyForIntake && (
                          <Menu.Item
                            leftSection={<IconDoorExit size={18} color='var(--mantine-color-gray-5)' />}
                            onClick={() => setExitToJailModalOpened(true)}
                          >
                            Record exit to jail
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
                    <Button
                      color='indigo'
                      radius='xl'
                      size='lg'
                      onClick={() => {
                        if (isAwaitingSafetyCheck) {
                          safetyCheckMutation.mutate();
                          return;
                        }
                        navigate(`/custody/${deflection.id}/legal-release?from=detail`);
                      }}
                      loading={safetyCheckMutation.isPending}
                    >
                      {showStartLegalReleasePrimary ? 'Start legal release' : 'Complete safety check'}
                    </Button>
                  </>
                  )}
            </Group>
          </Container>
        </Box>
      )}
      {(careFooterState.showFooter || showCustodyActionFooter) && <Box h='104px' />}
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
    </>
  );
}

export default CustodyDetailContent;
