import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Head } from '@unhead/react';
import { Accordion, Box, Button, Container, Divider, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconAlarm } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import useNow from '@/hooks/useNow';
import CancelHoldModal from './CancelHoldModal';
import CancelIncidentModal from './CancelIncidentModal';
import Header from '@/components/Header';
import { useFacilityContext } from '@/FacilityContext';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { formatAddress, formatDateTime, formatTimeRemaining } from '@/utils/format';
import { generate647fTransferFormPDF } from '@/utils/pdfGenerator';
import { isValidDeflection, isValidSubject, isValidNarcotics, isValidDeflectionDetails, isValidProperty, isValidIncident } from '@/utils/validators';
import DeflectionStatusChip from './DeflectionStatusChip';
import { getSfpdDeflectionStatusChip, isExpiredBeforeTransfer } from './deflectionStatusChipUtils';

function Deflection () {
  const { id } = useParams();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const { data: activeDeflections, isFetching: isFetchingActiveDeflections } = useQuery({
    queryKey: ['deflections', incident?.id, 'active'],
    queryFn: () => Api.deflections.list({ incidentId: incident.id, active: true }).then(response => response.data),
    enabled: !!incident,
  });

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Person X';
  const address = formatAddress(deflection?.subject ?? {});
  const incidentAddress = formatAddress(incident ?? {});
  const detailsComplete = deflection ? isValidDeflection(deflection) : false;
  const isCustodyTransferred = [
    'AWAITING_INTAKE',
    'READY_FOR_INTAKE',
    'FAILED_INTAKE',
    'ADMITTED',
    'IN_CHAIR',
    'RELEASED',
    'EXITED',
    'DEATH_IN_FACILITY',
    'DEATH_IN_CUSTODY',
  ].includes(deflection?.subjectStatus);
  const isExpiredAutoCancelled = isExpiredBeforeTransfer(deflection, DateTime.now());
  const isActionableActiveHold = !!deflection && deflection.status === 'ACTIVE' && !isExpiredAutoCancelled && !isCustodyTransferred;
  const canEditHoldDetails = !isExpiredAutoCancelled;
  const showFinishDetailsFooter = isActionableActiveHold && !detailsComplete;
  const showCancelOnlyFooter = isActionableActiveHold && detailsComplete;
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
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = cachedDeflections.filter(deflection => deflection.id !== id);
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
        if (updatedDeflections.length === 0 && !incident?.arrivedAt) {
          queryClient.invalidateQueries(['facilities', facility.id, 'active-incident']);
        }
      }
      queryClient.invalidateQueries(['facilities', facility.id, 'bed-types']);
      setShowCancelModal(false);
      showToast('Hold cancelled', 'success', 4000, `You cancelled the hold for ${name}.`);
      navigate('/holds');
    },
  });

  const cancelIncidentMutation = useMutation({
    mutationFn: ({ incidentId, cancelReasonId }) => Api.incidents.cancel(incidentId, { cancelReasonId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.setQueryData(
        ['facilities', facility.id, 'active-incident'],
        null
      );
      await queryClient.removeQueries({
        queryKey: ['deflections', incident?.id, 'active'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['deflections', facility.id, 'inactive'],
      });
      setShowCancelModal(false);
      showToast('Incident canceled', 'success', 4000, 'Any chairs have been released. Ready for new incident.');
      navigate('/holds');
    },
    onError: (error) => {
      const isNetworkError = !error?.response;

      if (isNetworkError) {
        showToast('Connection failure', 'warning', 4000, 'Failed to cancel incident. Check your connection and try again.');
        return;
      }

      showToast('We couldn’t cancel the incident', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  const activeHoldsCount = activeDeflections?.length;
  const isLastActiveDetailedHold =
    !!deflection?.subjectId &&
    deflection?.status === 'ACTIVE' &&
    activeHoldsCount === 1;

  async function onCancelHoldConfirmed (cancelReasonId) {
    if (isLastActiveDetailedHold && incident?.id) {
      await cancelIncidentMutation.mutateAsync({
        incidentId: incident.id,
        cancelReasonId,
      });
      return;
    }

    await cancelDeflectionMutation.mutateAsync({
      cancelReasonId,
    });
  }

  function on647fClick () {
    try {
      const doc = generate647fTransferFormPDF(deflection, facility);
      // Open PDF in browser
      doc.output('dataurlnewwindow');
      showToast('647(f) Transfer Form opened in new window', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  }

  return (
    <>
      <Head>
        <title>Details</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/holds' />
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
              <Text size='md'>Incident {incident ? incident.id : ''}</Text>
              <Text c='gray.5' size='md'>•</Text>
              <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
            </Group>
            <DeflectionStatusChip label={statusChip?.label} tone={statusChip?.tone} />
          </Stack>
          {deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER' && (
            <>
              <Group>
                <Button onClick={on647fClick} variant='outline' size='md'>647(f).pdf</Button>
              </Group>
            </>
          )}
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
            {address && (
              <Box>
                <Text c='dimmed'>Address</Text>
                <Text>{address}</Text>
              </Box>
            )}
            {canEditHoldDetails && (
              <Group mt='md'>
                <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/subject`)}>{isValidSubject(deflection?.subject) ? 'Edit details' : 'Finish details'}</Button>
              </Group>
            )}
          </Stack>
          <Accordion variant='section' defaultValue={['narcotics', 'drug-use', 'deflection', 'property', 'incident']}>
            <Divider />
            <Accordion.Item value='narcotics'>
              <Accordion.Control>
                <Title order={3}>Narcotics</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Controlled substance</Text>
                    {(deflection?.narcoticsSubstance !== null && deflection?.narcoticsSubstance !== undefined)
                      ? (
                        <Text c={deflection.narcoticsSubstance ? 'red.6' : 'teal.6'}>{deflection.narcoticsSubstance ? 'Yes' : 'No'}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Paraphernalia</Text>
                    {(deflection?.narcoticsParaphernalia !== null && deflection?.narcoticsParaphernalia !== undefined)
                      ? (
                        <Text c={deflection.narcoticsParaphernalia ? 'red.6' : 'teal.6'}>{deflection.narcoticsParaphernalia ? 'Yes' : 'No'}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                </Stack>
                {canEditHoldDetails && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/narcotics`)}>{isValidNarcotics(deflection) ? 'Edit narcotics' : 'Finish narcotics'}</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='drug-use'>
              <Accordion.Control>
                <Title order={3}>Drug use</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  {(deflection?.drugUseEvidence !== null && deflection?.drugUseEvidence !== undefined)
                    ? (
                      <Box>
                        <Text c='dimmed'>Evidence of drug use</Text>
                        <Text c={deflection.drugUseEvidence ? 'red.6' : 'teal.6'}>{deflection.drugUseEvidence ? 'Yes' : 'No'}</Text>
                      </Box>
                      )
                    : (<Text c='dimmed'>No drug use details recorded</Text>)}
                  {deflection?.drugUseEvidence === true && !!deflection?.drugType && (
                    <Box>
                      <Text c='dimmed'>Drug type</Text>
                      <Text>{t(`drugType.${deflection.drugType}`)}</Text>
                    </Box>
                  )}
                </Stack>
                {canEditHoldDetails && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/drug-use`)}>Edit drug use</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='deflection'>
              <Accordion.Control>
                <Title order={3}>Arrest details</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  <Box>
                    <Text c='dimmed'>Selected observations</Text>
                    {deflection?.deflectionDetails?.length
                      ? (
                        <Text>{deflection?.deflectionDetails?.map(detail => detail.name).join('; ')}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  {deflection?.volunteeredToReset !== null && deflection?.volunteeredToReset !== undefined && (
                    <Box>
                      <Text c='dimmed'>Person volunteered to be taken to RESET</Text>
                      <Text c={deflection.volunteeredToReset ? 'teal.6' : 'red.6'}>{deflection.volunteeredToReset ? 'Yes' : 'No'}</Text>
                    </Box>
                  )}
                  <Box>
                    <Text c='dimmed'>Narrative (arrestable behavior)</Text>
                    {deflection?.behavior
                      ? (
                        <Text style={{ whiteSpace: 'pre-wrap' }}>{deflection?.behavior}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                </Stack>
                {canEditHoldDetails && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/deflection`)}>{isValidDeflectionDetails(deflection) ? 'Edit arrest' : 'Finish arrest'}</Button>
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
                {canEditHoldDetails && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate(`/holds/${deflection?.id}/property`)}>{isValidProperty(deflection) ? 'Edit property' : 'Finish property'}</Button>
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
                    <Text c='dimmed'>Arrest location</Text>
                    {incidentAddress
                      ? (
                        <Text>{incidentAddress}</Text>
                        )
                      : (<Text c='red.6'>Incomplete</Text>)}
                  </Box>
                  <Box>
                    <Text c='dimmed'>Arrest date & time</Text>
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
                {canEditHoldDetails && (
                  <Group mt='md'>
                    <Button variant='secondary' size='md' onClick={() => navigate('/incident')}>{isValidIncident(incident) ? 'Edit incident' : 'Finish incident'}</Button>
                  </Group>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Container>
      {showActionFooter && (
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
            <Group justify='center' gap='sm' wrap='nowrap'>
              <Button
                onClick={() => setShowCancelModal(true)}
                variant='destructive'
                disabled={isFetchingActiveDeflections}
              >
                Cancel hold
              </Button>
              {showFinishDetailsFooter && (
                <Button
                  onClick={() => navigate(`/holds/${deflection?.id}/subject`)}
                  color='indigo'
                >
                  Finish details
                </Button>
              )}
            </Group>
          </Container>
        </Box>
      )}
      {showActionFooter && <Box h='104px' />}
      {!!deflection && showCancelModal && (!isLastActiveDetailedHold) && (
        <CancelHoldModal
          deflection={deflection}
          opened={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={onCancelHoldConfirmed}
          loading={cancelDeflectionMutation.isPending || isFetchingActiveDeflections}
        />
      )}
      {!!deflection && showCancelModal && isLastActiveDetailedHold && (
        <CancelIncidentModal
          opened={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={onCancelHoldConfirmed}
          requiresReason
          isLastHoldDetailedCancellation
          loading={cancelIncidentMutation.isPending}
        />
      )}
    </>
  );
}

export default Deflection;
