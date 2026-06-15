import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Head } from '@unhead/react';
import { Accordion, Box, Button, Container, Divider, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconAlarm, IconFileText } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import useNow from '@/hooks/useNow';
import CancelHoldModal from './CancelHoldModal';
import Header from '@/components/Header';
import { useFacilityContext } from '@/FacilityContext';
import ActionFooter from '@/components/ActionFooter';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { formatAddress, formatDateTime, formatTimeRemaining } from '@/utils/format';
import { openInBrowser } from '@/utils/openInBrowser';
import { isValidDeflection, isValidSubject, isValidSubstance, isValidNarcotics, isValidBehavior, isValidProperty, isValidCertification, isValidIncident } from '@/utils/validators';
import DeflectionStatusChip from './DeflectionStatusChip';
import DocumentsSection from './DocumentsSection.jsx';
import { getSfpdDeflectionStatusChip, isExpiredBeforeTransfer } from './deflectionStatusChipUtils';
import { isCustodyTransferredStatus } from './custodyTransferStatus';
import { getSfpdDocuments } from './sfpdDocuments';

function Deflection () {
  const { id } = useParams();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast, removeToast } = useToast();
  const { user } = useAuthContext();

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Person X';
  const address = formatAddress(deflection?.subject ?? {});
  const incident = deflection?.incident;
  const incidentAddress = formatAddress(incident ?? {});
  const allDetailsComplete = deflection ? isValidDeflection(deflection) && isValidIncident(incident) : false;
  const subjectDetailsComplete = deflection ? isValidSubject(deflection.subject) : false;
  const substanceComplete = deflection
    ? isValidSubstance({
      narcoticsSubstance: deflection.narcoticsSubstance,
      narcoticsParaphernalia: deflection.narcoticsParaphernalia,
      drugUseEvidence: deflection.drugUseEvidence,
      drugType: deflection.drugType ?? null,
    })
    : false;
  const isCustodyTransferred = isCustodyTransferredStatus(deflection?.subjectStatus);
  const isExpiredAutoCancelled = isExpiredBeforeTransfer(deflection, DateTime.now());
  const isOwner = !!deflection && deflection.currentOfficerId === user?.id;
  const isActionableActiveHold = isOwner && !!deflection && deflection.status === 'ACTIVE' && !isExpiredAutoCancelled && !isCustodyTransferred;
  const showFinishDetailsFooter = isActionableActiveHold && !allDetailsComplete;
  const showCancelOnlyFooter = isActionableActiveHold && allDetailsComplete;
  const showActionFooter = showFinishDetailsFooter || showCancelOnlyFooter;
  const statusChip = getSfpdDeflectionStatusChip({ deflection, incident });

  const isActive = deflection?.status === 'ACTIVE';
  const isExpiredStatus = deflection?.status === 'EXPIRED';
  const expiresAt = deflection?.expiresAt;

  const timerEnabled = !!expiresAt && (isActive || isExpiredStatus) && !isCustodyTransferred;
  const now = useNow(1000, timerEnabled);

  const minutesUntilExpiration = expiresAt
    ? DateTime.fromISO(expiresAt).diff(now, 'minutes').minutes
    : null;
  const isExpired = isExpiredStatus || (isActive && minutesUntilExpiration !== null && minutesUntilExpiration < 0);
  const isExpiringSoon = isActive && !isExpired && minutesUntilExpiration !== null && minutesUntilExpiration < 10;
  const showTimer = !!expiresAt && (isActive || isExpiredStatus) && !isCustodyTransferred;

  const [showCancelModal, setShowCancelModal] = useState(false);

  const cancelDeflectionMutation = useMutation({
    mutationFn: (data) => Api.deflections.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'bed-types'] });
      setShowCancelModal(false);
      showToast('Hold cancelled', 'success', 4000, `You cancelled the hold for ${name}.`);
      navigate('/holds');
    },
    onError: (error) => {
      const message = error?.response?.data?.error;
      if (error?.response?.status === 422 && message) {
        showToast(message, 'error');
        return;
      }
      showToast('We couldn’t cancel the hold', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  async function onCancelHoldConfirmed (cancelReason) {
    await cancelDeflectionMutation.mutateAsync({
      cancelReason,
    });
  }

  function formatCertificationTimestamp (certifiedAt) {
    const dateTime = DateTime.fromISO(certifiedAt);
    return `${dateTime.toLocaleString(DateTime.TIME_SIMPLE)} on ${dateTime.toLocaleString(DateTime.DATE_SHORT)}`;
  }

  function view647fForm () {
    navigate(`/forms/647f/${deflection.id}`);
  }

  function download647fForm () {
    const url = `/api/forms/647f/pdf/${deflection.id}`;
    const toastId = showToast('Downloading 647(f) form…', 'success', 0, 'This may take a moment.');
    openInBrowser(url, `647f-${deflection.id}.pdf`)
      .then(() => {
        removeToast(toastId);
        showToast('647(f) form ready', 'success', 4000, 'Open your downloads/Files app to view or print.');
      })
      .catch(() => {
        removeToast(toastId);
        showToast('Couldn’t download 647(f) form', 'error', 4000, 'Please try again.');
      });
  }

  const sfpdDocuments = getSfpdDocuments({ deflection, view647fForm, download647fForm });
  const canShow647fDocument = sfpdDocuments.length > 0;

  return (
    <>
      <Head>
        <title>Details</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/holds' aria-label='Go back' />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Stack gap='sm' align='center'>
            <Group gap='xs'>
              <IconAlarm size={20} color={isExpired || isExpiringSoon ? 'var(--mantine-color-red-3)' : 'var(--mantine-color-gray-5)'} />
              {showTimer && (
                isExpired
                  ? <Text size='lg' c='red.6'>Hold expired</Text>
                  : isExpiringSoon
                    ? <Text size='lg' c='red.6'>Expires in {formatTimeRemaining(expiresAt, now)}</Text>
                    : <Text size='lg'>Expires in {formatTimeRemaining(expiresAt, now)}</Text>
              )}
            </Group>
            <Group gap='xs'>
              <Text size='md'>Incident {deflection ? deflection.incidentId : ''}</Text>
              <Text c='gray.5' size='md'>•</Text>
              <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
            </Group>
            <DeflectionStatusChip label={statusChip?.label} tone={statusChip?.tone} />
          </Stack>
          <Stack gap='sm'>
            <Title order={2}>{name}</Title>
            <Box>
              <Text c='dimmed'>Date of birth</Text>
              {deflection?.subject?.dateOfBirth
                ? (
                  <Text>{DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toLocaleString(DateTime.DATE_SHORT)}</Text>
                  )
                : (<Text c='red.6'>Incomplete</Text>)}
            </Box>
            <Box>
              <Text c='dimmed'>Sex</Text>
              {deflection?.subject?.sex
                ? (
                  <Text>{t(`sex.${deflection.subject.sex}`)}</Text>
                  )
                : (<Text c='red.6'>Incomplete</Text>)}
            </Box>
            <Box>
              <Text c='dimmed'>Race</Text>
              {deflection?.subject?.race
                ? (
                  <Text>{t(`race.${deflection.subject.race}`)}</Text>
                  )
                : (<Text c='red.6'>Incomplete</Text>)}
            </Box>
            {deflection?.subject?.driverLicense && (
              <Box>
                <Text c='dimmed'>Driver's license number</Text>
                <Text>{deflection.subject.driverLicense}</Text>
              </Box>
            )}
            {deflection?.subject?.preferredLanguage && (
              <Box>
                <Text c='dimmed'>Preferred language</Text>
                <Text>{t(`preferredLanguage.${deflection.subject.preferredLanguage}`)}</Text>
              </Box>
            )}
            {address && (
              <Box>
                <Text c='dimmed'>Address</Text>
                <Text>{address}</Text>
              </Box>
            )}
            {isActionableActiveHold && (
              <Group mt='md'>
                <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/subject`)}>
                  {subjectDetailsComplete ? 'Edit details' : 'Finish details'}
                </Button>
              </Group>
            )}
          </Stack>
          <Accordion variant='section' defaultValue={['documents', 'substance', 'drug-use', 'deflection', 'property', 'certification', 'incident']}>
            <Divider />
            <DocumentsSection documents={sfpdDocuments} />
            <Accordion.Item value='substance'>
              <Accordion.Control>
                <Title order={3}>Substance details</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Controlled substance found</Text>
                    {(deflection?.narcoticsSubstance !== null && deflection?.narcoticsSubstance !== undefined)
                      ? (
                        <Text>{deflection.narcoticsSubstance ? 'Yes' : 'No'}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Paraphernalia found</Text>
                    {(deflection?.narcoticsParaphernalia !== null && deflection?.narcoticsParaphernalia !== undefined)
                      ? (
                        <Text>{deflection.narcoticsParaphernalia ? 'Yes' : 'No'}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                </Stack>
                {isActionableActiveHold && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/substance`)}>{isValidNarcotics(deflection) ? 'Edit narcotics' : 'Finish narcotics'}</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='drug-use'>
              <Accordion.Control>
                <Title order={3}>Substance use</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Signs of substance use</Text>
                    {(deflection?.drugUseEvidence !== null && deflection?.drugUseEvidence !== undefined)
                      ? (
                        <Text>{deflection.drugUseEvidence ? 'Yes' : 'No'}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  {deflection?.drugUseEvidence === true && (
                    <Box>
                      <Text c='dimmed'>Substance used</Text>
                      {deflection?.drugType
                        ? <Text>{t(`drugType.${deflection.drugType}`)}</Text>
                        : <Text c='red.6'>Incomplete</Text>}
                    </Box>
                  )}
                </Stack>
                {isActionableActiveHold && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/substance`)}>
                      {substanceComplete ? 'Edit substance details' : 'Finish substance details'}
                    </Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='deflection'>
              <Accordion.Control>
                <Title order={3}>Custodial arrest details</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Behavioral observation</Text>
                    {deflection?.behaviorNarrative
                      ? (
                        <Text style={{ whiteSpace: 'pre-wrap' }}>{deflection.behaviorNarrative}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Charge type</Text>
                    {deflection?.chargeType
                      ? <Text>{t(`chargeType.${deflection.chargeType}`)}</Text>
                      : <Text c='red.6'>Incomplete</Text>}
                  </Box>
                </Stack>
                {isActionableActiveHold && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/deflection`)}>{isValidBehavior(deflection) ? 'Edit details' : 'Finish details'}</Button>
                  </Group>
                )}
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
                  <Box>
                    <Text c='dimmed'>Volume of property</Text>
                    {deflection?.property
                      ? (
                        <Text>{t(`property.${deflection?.property}`)}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  {!!deflection?.propertyDetails && (
                    <Box>
                      <Text c='dimmed'>Description</Text>
                      <Text>{deflection?.propertyDetails}</Text>
                    </Box>
                  )}
                </Stack>
                {isActionableActiveHold && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/property`)}>{isValidProperty(deflection) ? 'Edit property' : 'Finish property'}</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='certification'>
              <Accordion.Control>
                <Title order={3}>Certification</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Declaration</Text>
                    {deflection?.certifiedAt
                      ? (
                        <Text>Certified as true and correct at {formatCertificationTimestamp(deflection.certifiedAt)}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                </Stack>
                {isActionableActiveHold && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/certify`)}>{isValidCertification(deflection) ? 'Edit certification' : 'Finish certification'}</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='incident'>
              <Accordion.Control>
                <Title order={3}>Incident details</Title>
                <Text c='gray.5' size='sm'>These details apply to all holds in this incident.</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Location</Text>
                    {incidentAddress
                      ? (
                        <Text>{incidentAddress}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Date & time</Text>
                    {incident?.arrestedAt
                      ? (
                        <Text>{formatDateTime(incident.arrestedAt)}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Encountered via</Text>
                    {incident?.encounteredVia
                      ? (
                        <Text>{t(`encounteredVia.${incident?.encounteredVia}`)}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>CAD number</Text>
                    {incident?.cadNumber
                      ? (
                        <Text>{incident?.cadNumber}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Case number</Text>
                    {incident?.caseNumber
                      ? (
                        <Text>{incident?.caseNumber}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Supervising Sergeant's Star Number</Text>
                    {incident?.supervisorBadgeNumber
                      ? (
                        <Text>{incident?.supervisorBadgeNumber}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                </Stack>
                {isActionableActiveHold && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/incident/${deflection?.incidentId}`)}>{isValidIncident(incident) ? 'Edit incident' : 'Finish incident'}</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Container>
      {showActionFooter && (
        <ActionFooter>
          <Button
            onClick={() => setShowCancelModal(true)}
            variant='destructive'
          >
            Cancel hold
          </Button>
          {showFinishDetailsFooter && (
            <Button
              onClick={() => {
                const detailPath = `/holds/${deflection?.id}`;
                if (!isValidIncident(incident)) {
                  navigate(`/incident/${deflection?.incidentId}?next=${encodeURIComponent(detailPath)}&revisit=true`);
                  return;
                }
                if (!isValidSubject(deflection.subject)) {
                  navigate(`${detailPath}/subject`);
                  return;
                }
                if (!isValidSubstance({
                  narcoticsSubstance: deflection.narcoticsSubstance,
                  narcoticsParaphernalia: deflection.narcoticsParaphernalia,
                  drugUseEvidence: deflection.drugUseEvidence,
                  drugType: deflection.drugType ?? null,
                })) {
                  navigate(`${detailPath}/substance`);
                  return;
                }
                if (!isValidBehavior(deflection)) {
                  navigate(`${detailPath}/deflection`);
                  return;
                }
                if (!isValidProperty(deflection)) {
                  navigate(`${detailPath}/property`);
                  return;
                }
                if (!isValidCertification(deflection)) {
                  navigate(`${detailPath}/certify`);
                  return;
                }
                navigate(detailPath);
              }}
            >
              Finish details
            </Button>
          )}
        </ActionFooter>
      )}
      {canShow647fDocument && (
        <ActionFooter>
          <Button onClick={download647fForm} leftSection={<IconFileText size={18} />}>Download 647(f) form</Button>
        </ActionFooter>
      )}
      {(showActionFooter || canShow647fDocument) && <Box h='120px' />}
      {!!deflection && showCancelModal && (
        <CancelHoldModal
          deflections={[deflection]}
          opened={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={onCancelHoldConfirmed}
          loading={cancelDeflectionMutation.isPending}
        />
      )}
    </>
  );
}

export default Deflection;
